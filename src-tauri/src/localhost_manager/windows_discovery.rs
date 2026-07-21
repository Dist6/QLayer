use super::models::ListenerRow;

pub(crate) fn discover_listeners() -> Result<Vec<ListenerRow>, String> {
    platform::discover_listeners()
}

pub(crate) fn port_from_network(value: u32) -> u16 {
    u16::from_be(value as u16)
}

#[cfg(windows)]
mod platform {
    use super::{port_from_network, ListenerRow};
    use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
    use windows::Win32::Foundation::ERROR_INSUFFICIENT_BUFFER;
    use windows::Win32::NetworkManagement::IpHelper::{
        GetExtendedTcpTable, MIB_TCP6ROW_OWNER_PID, MIB_TCPROW_OWNER_PID, MIB_TCP_STATE_LISTEN,
        TCP_TABLE_OWNER_PID_LISTENER,
    };
    use windows::Win32::Networking::WinSock::{AF_INET, AF_INET6};

    const DISCOVERY_ERROR: &str = "Local development servers could not be inspected.";

    pub(super) fn discover_listeners() -> Result<Vec<ListenerRow>, String> {
        let mut listeners = discover_ipv4()?;
        listeners.extend(discover_ipv6()?);
        listeners.sort_by_key(|listener| (listener.port, listener.pid, listener.address));
        Ok(listeners)
    }

    fn discover_ipv4() -> Result<Vec<ListenerRow>, String> {
        let rows = query_table::<MIB_TCPROW_OWNER_PID>(AF_INET.0 as u32)?;
        Ok(rows
            .into_iter()
            .filter(|row| row.dwState == MIB_TCP_STATE_LISTEN.0 as u32)
            .map(|row| ListenerRow {
                address: IpAddr::V4(Ipv4Addr::from(row.dwLocalAddr.to_ne_bytes())),
                port: port_from_network(row.dwLocalPort),
                pid: row.dwOwningPid,
            })
            .collect())
    }

    fn discover_ipv6() -> Result<Vec<ListenerRow>, String> {
        let rows = query_table::<MIB_TCP6ROW_OWNER_PID>(AF_INET6.0 as u32)?;
        Ok(rows
            .into_iter()
            .filter(|row| row.dwState == MIB_TCP_STATE_LISTEN.0 as u32)
            .map(|row| ListenerRow {
                address: IpAddr::V6(Ipv6Addr::from(row.ucLocalAddr)),
                port: port_from_network(row.dwLocalPort),
                pid: row.dwOwningPid,
            })
            .collect())
    }

    fn query_table<Row: Copy>(address_family: u32) -> Result<Vec<Row>, String> {
        let mut required_size = 0_u32;
        let initial = unsafe {
            GetExtendedTcpTable(
                None,
                &mut required_size,
                false,
                address_family,
                TCP_TABLE_OWNER_PID_LISTENER,
                0,
            )
        };
        if initial != ERROR_INSUFFICIENT_BUFFER.0 || required_size < size_of::<u32>() as u32 {
            return Err(DISCOVERY_ERROR.to_string());
        }

        let word_count = (required_size as usize).div_ceil(size_of::<u32>());
        let mut buffer = vec![0_u32; word_count];
        let result = unsafe {
            GetExtendedTcpTable(
                Some(buffer.as_mut_ptr().cast()),
                &mut required_size,
                false,
                address_family,
                TCP_TABLE_OWNER_PID_LISTENER,
                0,
            )
        };
        if result != 0 {
            return Err(DISCOVERY_ERROR.to_string());
        }

        let count = buffer[0] as usize;
        let rows_size = count
            .checked_mul(size_of::<Row>())
            .and_then(|size| size.checked_add(size_of::<u32>()))
            .ok_or_else(|| DISCOVERY_ERROR.to_string())?;
        if rows_size > required_size as usize || rows_size > buffer.len() * size_of::<u32>() {
            return Err(DISCOVERY_ERROR.to_string());
        }

        let rows =
            unsafe { std::slice::from_raw_parts(buffer.as_ptr().add(1).cast::<Row>(), count) };
        Ok(rows.to_vec())
    }
}

#[cfg(not(windows))]
mod platform {
    use super::ListenerRow;

    pub(super) fn discover_listeners() -> Result<Vec<ListenerRow>, String> {
        Err("Localhost Manager is available only on Windows.".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::port_from_network;

    #[test]
    fn converts_network_order_ports() {
        assert_eq!(port_from_network(0x3514), 5173);
        assert_eq!(port_from_network(0x901f), 8080);
    }
}
