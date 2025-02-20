
import { PeerConnection } from './types';
import { SignalingService } from './signaling';

const DEFAULT_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

export class PeerManager {
  private connections: Map<string, PeerConnection> = new Map();
  public signalingService: SignalingService;

  constructor(
    private userId: string,
    private onMessageCallback: ((message: string, peerId: string) => void) | null = null
  ) {
    this.signalingService = new SignalingService(userId);
  }

  private async setupDataChannel(connection: PeerConnection, peerId: string) {
    if (connection.connection.connectionState === 'connected') {
      const dataChannel = connection.connection.createDataChannel('messageChannel');
      connection.dataChannel = dataChannel;

      dataChannel.onmessage = (event) => {
        if (this.onMessageCallback) {
          this.onMessageCallback(event.data, peerId);
        }
      };

      dataChannel.onopen = () => {
        console.log('Data channel opened');
      };

      dataChannel.onclose = () => {
        console.log('Data channel closed');
      };
    }
  }

  private setupConnectionEventHandlers(connection: PeerConnection, peerId: string) {
    connection.connection.onicecandidate = async (event) => {
      if (event.candidate) {
        await this.signalingService.sendSignal({
          sender_id: this.userId,
          receiver_id: peerId,
          signal_data: { candidate: event.candidate }
        });
      }
    };

    connection.connection.ondatachannel = (event) => {
      connection.dataChannel = event.channel;
      
      event.channel.onmessage = (e) => {
        if (this.onMessageCallback) {
          this.onMessageCallback(e.data, peerId);
        }
      };
    };

    connection.connection.onconnectionstatechange = () => {
      console.log('Connection state:', connection.connection.connectionState);
      if (connection.connection.connectionState === 'connected') {
        this.setupDataChannel(connection, peerId);
      }
    };
  }

  async handleIncomingSignal(signal: any) {
    const { sender_id, signal_data } = signal;
    
    let connection = this.connections.get(sender_id);
    if (!connection) {
      console.log('Creating new peer connection for incoming signal');
      const peerConnection = new RTCPeerConnection(DEFAULT_CONFIG);
      
      connection = {
        peer: null,
        connection: peerConnection,
        dataChannel: null
      };

      this.connections.set(sender_id, connection);
      this.setupConnectionEventHandlers(connection, sender_id);
    }

    try {
      if (signal_data.candidate) {
        await connection.connection.addIceCandidate(new RTCIceCandidate(signal_data.candidate));
      } else if (signal_data.sdp) {
        await connection.connection.setRemoteDescription(new RTCSessionDescription(signal_data));
        if (signal_data.type === 'offer') {
          const answer = await connection.connection.createAnswer();
          await connection.connection.setLocalDescription(answer);
          await this.signalingService.sendSignal({
            sender_id: this.userId,
            receiver_id: sender_id,
            signal_data: connection.connection.localDescription
          });
        }
      }
    } catch (error) {
      console.error('Error handling signal:', error);
      this.connections.delete(sender_id);
      throw error;
    }
  }

  async createPeer(peerId: string) {
    console.log('Creating new peer connection');
    const peerConnection = new RTCPeerConnection(DEFAULT_CONFIG);

    const connection: PeerConnection = {
      peer: null,
      connection: peerConnection,
      dataChannel: null
    };

    this.setupConnectionEventHandlers(connection, peerId);
    
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await this.signalingService.sendSignal({
        sender_id: this.userId,
        receiver_id: peerId,
        signal_data: peerConnection.localDescription
      });

      this.connections.set(peerId, connection);
      return connection;
    } catch (error) {
      console.error('Error creating peer:', error);
      throw error;
    }
  }

  getPeerConnection(peerId: string) {
    return this.connections.get(peerId);
  }

  disconnect(peerId: string) {
    const connection = this.connections.get(peerId);
    if (connection) {
      connection.connection.close();
      this.connections.delete(peerId);
    }
  }

  disconnectAll() {
    this.connections.forEach((_, peerId) => {
      this.disconnect(peerId);
    });
  }
}
