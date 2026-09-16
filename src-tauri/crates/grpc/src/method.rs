use http::uri::PathAndQuery;

pub const DAEMON_SERVICE: &str = "octelium.api.client.daemon.v1.MainService";
pub const USER_SERVICE: &str = "octelium.api.main.user.v1.MainService";
pub const AUTH_SERVICE: &str = "octelium.api.main.auth.v1.MainService";

pub const DAEMON_SERVICES: &[&str] = &[DAEMON_SERVICE];
pub const CLUSTER_SERVICES: &[&str] = &[USER_SERVICE, AUTH_SERVICE];

pub const DAEMON_FRONTEND_METHODS: &[&str] = &[
    "/octelium.api.client.daemon.v1.MainService/GetInfo",
    "/octelium.api.client.daemon.v1.MainService/WatchStatus",
    "/octelium.api.client.daemon.v1.MainService/Authenticate",
    "/octelium.api.client.daemon.v1.MainService/Connect",
    "/octelium.api.client.daemon.v1.MainService/Disconnect",
    "/octelium.api.client.daemon.v1.MainService/Logout",
    "/octelium.api.client.daemon.v1.MainService/CancelOperation",
    "/octelium.api.client.daemon.v1.MainService/UpdateDomainSettings",
    "/octelium.api.client.daemon.v1.MainService/DeleteDomain",
];

pub const CLUSTER_FRONTEND_METHODS: &[&str] = &[
    "/octelium.api.main.user.v1.MainService/ListService",
    "/octelium.api.main.user.v1.MainService/ListNamespace",
    "/octelium.api.main.user.v1.MainService/GetStatus",
];

pub fn get_service(method: &str) -> Option<&str> {
    let rest = method.strip_prefix('/')?;
    let (service, name) = rest.split_once('/')?;

    if service.is_empty() || name.is_empty() || name.contains('/') {
        return None;
    }

    Some(service)
}

pub fn validate_method(method: &str, allowed: &[&str]) -> Result<PathAndQuery, String> {
    let service = get_service(method).ok_or_else(|| format!("Invalid gRPC method: {method}"))?;

    if !allowed.contains(&service) {
        return Err(format!(
            "The Service {service} is not allowed by this frontend"
        ));
    }

    PathAndQuery::try_from(method).map_err(|_| format!("Invalid gRPC method: {method}"))
}

pub fn validate_frontend_method(method: &str, allowed: &[&str]) -> Result<PathAndQuery, String> {
    get_service(method).ok_or_else(|| format!("Invalid gRPC method: {method}"))?;

    if !allowed.contains(&method) {
        return Err(format!(
            "The method {method} is not allowed by this frontend"
        ));
    }

    PathAndQuery::try_from(method).map_err(|_| format!("Invalid gRPC method: {method}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_service() {
        assert_eq!(
            get_service("/octelium.api.client.daemon.v1.MainService/GetStatus"),
            Some("octelium.api.client.daemon.v1.MainService")
        );
        assert_eq!(get_service("octelium.api/GetStatus"), None);
        assert_eq!(get_service("/octelium.api"), None);
        assert_eq!(get_service("/octelium.api/"), None);
        assert_eq!(get_service("//GetStatus"), None);
        assert_eq!(get_service("/a/b/c"), None);
    }

    #[test]
    fn test_validate_method() {
        {
            let ret = validate_method(
                "/octelium.api.client.daemon.v1.MainService/GetStatus",
                DAEMON_SERVICES,
            );
            assert!(ret.is_ok());
        }
        {
            let ret = validate_method(
                "/octelium.api.main.user.v1.MainService/ListService",
                DAEMON_SERVICES,
            );
            assert!(ret.is_err());
        }
        {
            let ret = validate_method(
                "/octelium.api.main.user.v1.MainService/ListService",
                CLUSTER_SERVICES,
            );
            assert!(ret.is_ok());
        }
        {
            let ret = validate_method("/../etc/passwd", CLUSTER_SERVICES);
            assert!(ret.is_err());
        }
    }

    #[test]
    fn test_validate_frontend_method() {
        assert!(validate_frontend_method(
            "/octelium.api.client.daemon.v1.MainService/GetInfo",
            DAEMON_FRONTEND_METHODS,
        )
        .is_ok());
        assert!(validate_frontend_method(
            "/octelium.api.client.daemon.v1.MainService/GetAPICredential",
            DAEMON_FRONTEND_METHODS,
        )
        .is_err());
        assert!(validate_frontend_method(
            "/octelium.api.main.auth.v1.MainService/Logout",
            CLUSTER_FRONTEND_METHODS,
        )
        .is_err());
    }
}
