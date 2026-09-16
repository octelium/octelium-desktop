use std::env;
use std::path::PathBuf;

pub const DEFAULT_UNIX_SOCKET: &str = "/var/run/octelium/daemon.sock";
pub const DEFAULT_WINDOWS_PIPE: &str = r"\\.\pipe\octelium-daemon";

pub fn get_default_address() -> String {
    if let Ok(ret) = env::var("OCTELIUM_DAEMON_SOCKET") {
        if !ret.is_empty() {
            return ret;
        }
    }

    if cfg!(windows) {
        DEFAULT_WINDOWS_PIPE.to_string()
    } else {
        DEFAULT_UNIX_SOCKET.to_string()
    }
}

pub fn get_unix_endpoint(address: &str) -> String {
    format!("unix:{}", PathBuf::from(address).display())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_unix_endpoint() {
        assert_eq!(
            get_unix_endpoint("/var/run/octelium/daemon.sock"),
            "unix:/var/run/octelium/daemon.sock"
        );
    }
}
