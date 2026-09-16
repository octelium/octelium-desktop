use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use octelium_grpc::Client;
use tokio::sync::oneshot;

pub struct AppState {
    pub client: Client,
    next_call_id: AtomicU64,
    calls: Mutex<HashMap<u64, oneshot::Sender<()>>>,
}

impl AppState {
    pub fn new(client: Client) -> Self {
        Self {
            client,
            next_call_id: AtomicU64::new(1),
            calls: Mutex::new(HashMap::new()),
        }
    }

    pub fn add_call(&self) -> (u64, oneshot::Receiver<()>) {
        let id = self.next_call_id.fetch_add(1, Ordering::Relaxed);
        let (tx, rx) = oneshot::channel();

        self.calls.lock().unwrap().insert(id, tx);

        (id, rx)
    }

    pub fn finish_call(&self, id: u64) {
        self.calls.lock().unwrap().remove(&id);
    }

    pub fn cancel_call(&self, id: u64) {
        if let Some(tx) = self.calls.lock().unwrap().remove(&id) {
            let _ = tx.send(());
        }
    }

    pub fn cancel_every_call(&self) {
        let mut calls = self.calls.lock().unwrap();

        for (_, tx) in calls.drain() {
            let _ = tx.send(());
        }
    }
}
