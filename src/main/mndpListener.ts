import dgram from 'dgram';
import { networkInterfaces } from 'os';
import { MndpDevice } from '../shared/types';

export class MndpListener {
  private socket: dgram.Socket | null = null;
  private discoveredDevices: Map<string, MndpDevice> = new Map();
  private onDeviceDiscoveredCallbacks: ((devices: MndpDevice[]) => void)[] = [];
  private isListening = false;

  constructor() {}

  public startListening(port = 5678): void {
    if (this.isListening) return;

    try {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.socket.on('error', (err) => {
        console.warn('[MNDP] Socket error:', err.message);
        this.stopListening();
      });

      this.socket.on('message', (msg, rinfo) => {
        try {
          const device = this.parseMndpPacket(msg, rinfo.address);
          if (device) {
            const key = device.mac || device.ip;
            this.discoveredDevices.set(key, device);
            this.notifyCallbacks();
          }
        } catch (e) {
          console.error('[MNDP] Failed to parse packet:', e);
        }
      });

      this.socket.on('listening', () => {
        try {
          this.socket?.setBroadcast(true);
          const address = this.socket?.address();
          console.log(`[MNDP] Listening for MikroTik broadcast on port ${address?.port}`);
          this.isListening = true;
          // Send probe
          this.sendDiscoveryProbe();
        } catch (err) {
          console.warn('[MNDP] Could not set broadcast:', err);
        }
      });

      this.socket.bind(port, '0.0.0.0');
    } catch (err: any) {
      console.warn('[MNDP] Failed to bind UDP socket:', err.message);
    }
  }

  public stopListening(): void {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {
        // ignore
      }
      this.socket = null;
    }
    this.isListening = false;
  }

  public getDevices(): MndpDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  public onDevicesUpdated(cb: (devices: MndpDevice[]) => void): () => void {
    this.onDeviceDiscoveredCallbacks.push(cb);
    return () => {
      this.onDeviceDiscoveredCallbacks = this.onDeviceDiscoveredCallbacks.filter((c) => c !== cb);
    };
  }

  private notifyCallbacks(): void {
    const list = this.getDevices();
    for (const cb of this.onDeviceDiscoveredCallbacks) {
      try {
        cb(list);
      } catch (e) {
        console.error(e);
      }
    }
  }

  public sendDiscoveryProbe(): void {
    if (!this.socket || !this.isListening) return;

    // Standard MNDP query probe packet
    const probe = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const broadcastAddrs = this.getBroadcastAddresses();

    for (const addr of broadcastAddrs) {
      try {
        this.socket.send(probe, 0, probe.length, 5678, addr, (err) => {
          if (err) {
            // silent ignore
          }
        });
      } catch (e) {
        // ignore
      }
    }
  }

  private getBroadcastAddresses(): string[] {
    const addresses: string[] = ['255.255.255.255', '224.0.0.1'];
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      const netArr = nets[name];
      if (netArr) {
        for (const net of netArr) {
          if (net.family === 'IPv4' && !net.internal) {
            // calculate simple subnet broadcast or add direct gateway
            const parts = net.address.split('.');
            if (parts.length === 4) {
              addresses.push(`${parts[0]}.${parts[1]}.${parts[2]}.255`);
            }
          }
        }
      }
    }
    return addresses;
  }

  /**
   * Parse MNDP packet TLV
   */
  private parseMndpPacket(buffer: Buffer, senderIp: string): MndpDevice | null {
    if (buffer.length < 4) return null;

    let offset = 4; // Skip sequence/header
    let mac = '';
    let identity = 'MikroTik';
    let version = 'RouterOS';
    let platform = 'MikroTik';
    let boardName = 'RouterBoard';
    let ip = senderIp;
    let uptime = '';
    let interfaceName = '';

    while (offset + 4 <= buffer.length) {
      const type = buffer.readUInt16BE(offset);
      const len = buffer.readUInt16BE(offset + 2);
      offset += 4;

      if (offset + len > buffer.length) break;
      const val = buffer.subarray(offset, offset + len);

      switch (type) {
        case 0x0001: // MAC Address
          if (len === 6) {
            mac = Array.from(val)
              .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
              .join(':');
          }
          break;
        case 0x0005: // Identity
          identity = val.toString('utf8');
          break;
        case 0x0007: // Version
          version = val.toString('utf8');
          break;
        case 0x0008: // Platform
          platform = val.toString('utf8');
          break;
        case 0x0009: // IPv4 or interface IP
          if (len === 4) {
            ip = `${val[0]}.${val[1]}.${val[2]}.${val[3]}`;
          }
          break;
        case 0x000a: // Uptime in seconds
          if (len === 4) {
            const sec = val.readUInt32LE(0);
            uptime = `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
          }
          break;
        case 0x000c: // Board Name
          boardName = val.toString('utf8');
          break;
        case 0x000e: // Unicast IP
          if (len === 4) {
            ip = `${val[0]}.${val[1]}.${val[2]}.${val[3]}`;
          }
          break;
        case 0x0010: // Interface Name
          interfaceName = val.toString('utf8');
          break;
      }
      offset += len;
    }

    if (!ip) ip = senderIp;

    return {
      ip,
      mac: mac || '',
      identity,
      platform,
      version,
      boardName,
      uptime,
      interfaceName,
    };
  }

  /**
   * Quick active network scanner for finding MikroTik routers on standard subnets
   */
  public async scanSubnetRanges(): Promise<MndpDevice[]> {
    const results: MndpDevice[] = [];
    const knownIps = ['192.168.88.1', '192.168.1.1', '10.0.0.1', '172.16.0.1'];

    // Also get active adapter IP
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      const netArr = nets[name];
      if (netArr) {
        for (const net of netArr) {
          if (net.family === 'IPv4' && !net.internal) {
            const parts = net.address.split('.');
            if (parts.length === 4) {
              const gw = `${parts[0]}.${parts[1]}.${parts[2]}.1`;
              if (!knownIps.includes(gw)) knownIps.push(gw);
            }
          }
        }
      }
    }

    // Trigger MNDP broadcast probe
    this.sendDiscoveryProbe();

    return this.getDevices();
  }
}
