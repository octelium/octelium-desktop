pub mod codec;
pub mod daemon;
pub mod error;
pub mod method;

use std::collections::HashMap;
use std::time::{Duration, SystemTime};

use tokio::sync::Mutex;
use tonic::client::Grpc;
use tonic::codec::Streaming;
use tonic::transport::{Channel, Endpoint};
use tonic::{Code, Request};

pub use error::Error;

use codec::RawCodec;
use method::{CLUSTER_FRONTEND_METHODS, DAEMON_FRONTEND_METHODS, DAEMON_SERVICES};

const AUTH_METADATA_KEY: &str = "x-octelium-auth";
const GET_API_CREDENTIAL: &str = "/octelium.api.client.daemon.v1.MainService/GetAPICredential";
const CREDENTIAL_EXPIRY_MARGIN: Duration = Duration::from_secs(30);
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Target {
    Daemon,
    Cluster,
}

#[derive(Clone, PartialEq, prost::Message)]
struct GetAPICredentialRequest {
    #[prost(string, tag = "1")]
    domain: String,
}

#[derive(Clone, PartialEq, prost::Message)]
struct Timestamp {
    #[prost(int64, tag = "1")]
    seconds: i64,
    #[prost(int32, tag = "2")]
    nanos: i32,
}

#[derive(Clone, PartialEq, prost::Message)]
struct GetAPICredentialResponse {
    #[prost(string, tag = "1")]
    access_token: String,
    #[prost(message, optional, tag = "2")]
    expires_at: Option<Timestamp>,
}

#[derive(Clone)]
struct Credential {
    access_token: String,
    expires_at: Option<SystemTime>,
}

impl Credential {
    fn is_usable(&self) -> bool {
        match self.expires_at {
            Some(expires_at) => SystemTime::now() + CREDENTIAL_EXPIRY_MARGIN < expires_at,
            None => true,
        }
    }
}

pub struct Client {
    address: String,
    user_agent: String,
    daemon: Mutex<Option<Channel>>,
    clusters: Mutex<HashMap<String, Channel>>,
    credentials: Mutex<HashMap<String, Credential>>,
}

impl Client {
    pub fn new(address: Option<String>, user_agent: impl Into<String>) -> Self {
        Self {
            address: address
                .filter(|itm| !itm.is_empty())
                .unwrap_or_else(daemon::get_default_address),
            user_agent: user_agent.into(),
            daemon: Mutex::new(None),
            clusters: Mutex::new(HashMap::new()),
            credentials: Mutex::new(HashMap::new()),
        }
    }

    pub fn address(&self) -> &str {
        &self.address
    }

    pub async fn unary(
        &self,
        target: Target,
        domain: Option<&str>,
        method: &str,
        request: Vec<u8>,
    ) -> Result<Vec<u8>, Error> {
        let path = self.get_path(target, method)?;

        match target {
            Target::Daemon => self.call_daemon(path, request).await,
            Target::Cluster => {
                let domain = get_domain(domain)?;
                let channel = self.get_cluster_channel(domain).await?;

                let mut req = Request::new(request.clone());
                self.set_authorization(&mut req, domain, false).await?;

                let mut c = Grpc::new(channel.clone());
                c.ready()
                    .await
                    .map_err(|err| Error::unavailable(err.to_string()))?;

                let ret = c.unary(req, path.clone(), RawCodec).await;

                let status = match ret {
                    Ok(ret) => return Ok(ret.into_inner()),
                    Err(status) => status,
                };

                if status.code() != Code::Unauthenticated {
                    return Err(status.into());
                }

                let mut req = Request::new(request);
                self.set_authorization(&mut req, domain, true).await?;

                let mut c = Grpc::new(channel);
                c.ready()
                    .await
                    .map_err(|err| Error::unavailable(err.to_string()))?;

                Ok(c.unary(req, path, RawCodec).await?.into_inner())
            }
        }
    }

    pub async fn server_streaming(
        &self,
        target: Target,
        domain: Option<&str>,
        method: &str,
        request: Vec<u8>,
    ) -> Result<Streaming<Vec<u8>>, Error> {
        let path = self.get_path(target, method)?;

        let (channel, req) = match target {
            Target::Daemon => (self.get_daemon_channel().await?, Request::new(request)),
            Target::Cluster => {
                let domain = get_domain(domain)?;
                let channel = self.get_cluster_channel(domain).await?;
                let mut req = Request::new(request);
                self.set_authorization(&mut req, domain, false).await?;
                (channel, req)
            }
        };

        let mut c = Grpc::new(channel);
        c.ready()
            .await
            .map_err(|err| Error::unavailable(err.to_string()))?;

        Ok(c.server_streaming(req, path, RawCodec).await?.into_inner())
    }

    async fn call_daemon(
        &self,
        path: http::uri::PathAndQuery,
        request: Vec<u8>,
    ) -> Result<Vec<u8>, Error> {
        let mut c = Grpc::new(self.get_daemon_channel().await?);
        c.ready()
            .await
            .map_err(|err| Error::unavailable(err.to_string()))?;

        Ok(c.unary(Request::new(request), path, RawCodec)
            .await?
            .into_inner())
    }

    pub async fn invalidate_domain(&self, domain: &str) {
        self.credentials.lock().await.remove(domain);
        self.clusters.lock().await.remove(domain);
    }

    pub async fn reset(&self) {
        *self.daemon.lock().await = None;
        self.clusters.lock().await.clear();
        self.credentials.lock().await.clear();
    }

    fn get_path(&self, target: Target, method: &str) -> Result<http::uri::PathAndQuery, Error> {
        let allowed = match target {
            Target::Daemon => DAEMON_FRONTEND_METHODS,
            Target::Cluster => CLUSTER_FRONTEND_METHODS,
        };

        method::validate_frontend_method(method, allowed).map_err(Error::invalid_argument)
    }

    async fn get_daemon_channel(&self) -> Result<Channel, Error> {
        let mut guard = self.daemon.lock().await;

        if let Some(ret) = guard.as_ref() {
            return Ok(ret.clone());
        }

        let ret = new_daemon_channel(&self.address, &self.user_agent)?;
        *guard = Some(ret.clone());

        Ok(ret)
    }

    async fn get_cluster_channel(&self, domain: &str) -> Result<Channel, Error> {
        let mut guard = self.clusters.lock().await;

        if let Some(ret) = guard.get(domain) {
            return Ok(ret.clone());
        }

        let ret = new_cluster_channel(domain, &self.user_agent)?;
        guard.insert(domain.to_string(), ret.clone());

        Ok(ret)
    }

    async fn set_authorization<T>(
        &self,
        request: &mut Request<T>,
        domain: &str,
        renew: bool,
    ) -> Result<(), Error> {
        let credential = self.get_credential(domain, renew).await?;

        let value = credential
            .access_token
            .parse()
            .map_err(|_| Error::internal("Invalid Cluster access token"))?;

        request.metadata_mut().insert(AUTH_METADATA_KEY, value);

        Ok(())
    }

    async fn get_credential(&self, domain: &str, renew: bool) -> Result<Credential, Error> {
        let mut credentials = self.credentials.lock().await;

        if !renew {
            if let Some(ret) = credentials.get(domain) {
                if ret.is_usable() {
                    return Ok(ret.clone());
                }
            }
        }

        let request = GetAPICredentialRequest {
            domain: domain.to_string(),
        };

        let path = method::validate_method(GET_API_CREDENTIAL, DAEMON_SERVICES)
            .map_err(Error::invalid_argument)?;

        let ret = self
            .call_daemon(path, prost::Message::encode_to_vec(&request))
            .await?;

        let ret = <GetAPICredentialResponse as prost::Message>::decode(ret.as_slice())
            .map_err(|err| Error::internal(err.to_string()))?;

        if ret.access_token.is_empty() {
            return Err(Error::new(
                Code::Unauthenticated,
                format!("You are not authenticated to the domain {domain}"),
            ));
        }

        let ret = Credential {
            access_token: ret.access_token,
            expires_at: ret.expires_at.and_then(get_system_time),
        };

        credentials.insert(domain.to_string(), ret.clone());

        Ok(ret)
    }
}

fn get_domain(arg: Option<&str>) -> Result<&str, Error> {
    match arg {
        Some(ret) if !ret.is_empty() => Ok(ret),
        _ => Err(Error::invalid_argument(
            "The Cluster domain is required by this call",
        )),
    }
}

fn get_system_time(arg: Timestamp) -> Option<SystemTime> {
    if arg.seconds < 0 {
        return None;
    }

    SystemTime::UNIX_EPOCH.checked_add(Duration::new(arg.seconds as u64, arg.nanos.max(0) as u32))
}

pub fn get_cluster_endpoint(domain: &str) -> String {
    format!("https://octelium-api.{domain}:443")
}

fn new_cluster_channel(domain: &str, user_agent: &str) -> Result<Channel, Error> {
    let ret = Endpoint::from_shared(get_cluster_endpoint(domain))
        .map_err(|err| Error::invalid_argument(err.to_string()))?
        .user_agent(user_agent.to_string())
        .map_err(|err| Error::invalid_argument(err.to_string()))?
        .connect_timeout(CONNECT_TIMEOUT)
        .tcp_keepalive(Some(Duration::from_secs(45)))
        .tls_config(tonic::transport::ClientTlsConfig::new().with_native_roots())?
        .connect_lazy();

    Ok(ret)
}

#[cfg(not(windows))]
fn new_daemon_channel(address: &str, user_agent: &str) -> Result<Channel, Error> {
    let ret = Endpoint::from_shared(daemon::get_unix_endpoint(address))
        .map_err(|err| Error::invalid_argument(err.to_string()))?
        .user_agent(user_agent.to_string())
        .map_err(|err| Error::invalid_argument(err.to_string()))?
        .connect_timeout(CONNECT_TIMEOUT)
        .connect_lazy();

    Ok(ret)
}

#[cfg(windows)]
fn new_daemon_channel(address: &str, user_agent: &str) -> Result<Channel, Error> {
    use hyper_util::rt::TokioIo;
    use tokio::net::windows::named_pipe::ClientOptions;

    let address = address.to_string();

    let ret = Endpoint::from_static("http://octelium.daemon")
        .user_agent(user_agent.to_string())
        .map_err(|err| Error::invalid_argument(err.to_string()))?
        .connect_timeout(CONNECT_TIMEOUT)
        .connect_with_connector_lazy(tower::service_fn(move |_: http::Uri| {
            let address = address.clone();
            async move {
                let ret = ClientOptions::new().open(address.as_str())?;
                Ok::<_, std::io::Error>(TokioIo::new(ret))
            }
        }));

    Ok(ret)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_cluster_endpoint() {
        assert_eq!(
            get_cluster_endpoint("example.com"),
            "https://octelium-api.example.com:443"
        );
    }

    #[test]
    fn test_get_domain() {
        assert!(get_domain(Some("example.com")).is_ok());
        assert!(get_domain(Some("")).is_err());
        assert!(get_domain(None).is_err());
    }

    #[test]
    fn test_credential_is_usable() {
        {
            let ret = Credential {
                access_token: "token".to_string(),
                expires_at: None,
            };
            assert!(ret.is_usable());
        }
        {
            let ret = Credential {
                access_token: "token".to_string(),
                expires_at: Some(SystemTime::now() + Duration::from_secs(600)),
            };
            assert!(ret.is_usable());
        }
        {
            let ret = Credential {
                access_token: "token".to_string(),
                expires_at: Some(SystemTime::now() + Duration::from_secs(5)),
            };
            assert!(!ret.is_usable());
        }
        {
            let ret = Credential {
                access_token: "token".to_string(),
                expires_at: Some(SystemTime::now() - Duration::from_secs(5)),
            };
            assert!(!ret.is_usable());
        }
    }

    #[test]
    fn test_get_system_time() {
        {
            let ret = get_system_time(Timestamp {
                seconds: 1000,
                nanos: 0,
            });
            assert_eq!(
                ret,
                Some(SystemTime::UNIX_EPOCH + Duration::from_secs(1000))
            );
        }
        {
            let ret = get_system_time(Timestamp {
                seconds: -1,
                nanos: 0,
            });
            assert_eq!(ret, None);
        }
    }
}
