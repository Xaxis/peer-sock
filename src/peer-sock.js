var PeerSock = function peerSock(options) {
  options = options || {};
  return Object.assign(Object.create({}), {
    pc: null,
    channels: {},
    debug: options.debug || false,

    // Shims
    PeerConnection: window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.RTCPeerConnection,
    IceCandidate: window.mozRTCIceCandidate || window.RTCIceCandidate || window.RTCIceCandidate,
    SessionDescription: window.mozRTCSessionDescription || window.RTCSessionDescription,
    getUserMedia: navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia,

    // RTCConfiguration
    rtc_config: options.rtc_config || {
      iceServers: [
        {url: "stun:23.21.150.121"},
        {url: "stun:stun.l.google.com:19302"}
      ]
    },

    // RTCOptions
    rtc_options: options.rtc_options || {

      // @TODO - Why do the below configuration options break file transfer in chrome to chrome?
      // @TODO - Do both of the options break file transfer in chrome or just one or the other?
      //optional: [
      //  {DtlsSrtpKeyAgreement: true},
      //  {RtpDataChannels: true}
      //]
      optional: [
        {DtlsSrtpKeyAgreement: true}
      ]
    },

    // RTC Default Handlers
    rtc_handlers: {
      onaddstream: options.onaddstream || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onaddstream::', e);
      },
      ondatachannel: options.ondatachannel || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.ondatachannel::', e);
      },
      onicecandidate: options.onicecandidate || function(e) {

        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onicecandidate::', e);
        if (e.candidate == null) return;
        var
          self          = this,
          candidate     = e.candidate,
          client_id     = this.PeerSock.client_id,
          peer_id       = this.PeerSock.peer_id;

        // Listen for ice candidates from peer
        this.PeerSock.signal.onmessage('PeerSock_IceCandidate', function( candidateMessage ) {

          // Set ice candidate from peer
          self.PeerSock.pc.addIceCandidate(new self.PeerSock.IceCandidate(candidateMessage.message));
        });

        // Send ice candidate to peer
        this.PeerSock.signal.send('PeerSock_IceCandidate', peer_id, client_id, {
          candidate: candidate.candidate,
          sdpMLineIndex: candidate.sdpMLineIndex
        });

        // Nullify handler
        this.onicecandidate = null;
      },
      oniceconnectionstatechange: options.oniceconnectionstatechange || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.oniceconnectionstatechange::', e);
      },
      onidentityresult: options.onidentityresult || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onidentityresult::', e);
      },
      onidpassertionerror: options.onidpassertionerror || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onidpassertionerror::', e);
      },
      onidpvalidationerror: options.onidpvalidationerror || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onidpvalidationerror::', e);
      },
      onnegotiationneeded: options.onnegotiationneeded || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onnegotiationneeded::', e);
      },
      onpeeridentity: options.onpeeridentity || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onpeeridentity::', e);
      },
      onremovestream: options.onremovestream || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onremovestream::', e);
      },
      onsignalstatechange: options.onsignalstatechange || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.rtc_handlers.onsignalstatechange::', e);
      }
    },

    // DC Configuration
    dc_config: options.dc_config || {
      ordered: true,
      reliable: true
    },

    // DC Handlers
    dc_handlers: {
      onopen: options.onopen || function(e) {
        console.log(this);
        if (this.PeerSock.debug) console.log('PeerSock.dc_handlers.onopen::', e);
      },
      onerror: options.onerror || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.dc_handlers.onerror::', e);
      },
      onmessage: options.onmessage || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.dc_handlers.onmessage::', e);
      },
      onclose: options.onclose || function(e) {
        if (this.PeerSock.debug) console.log('PeerSock.dc_handlers.onclose::', e);
      }
    },

    // Signaling
    signal: options.signal || {
      socket: options.socket,

      /**
       * Sends a message to a target peer handler.
       *
       * @param handler_id {String}   Listening handler name to target set with 'onmessage'
       * @param peer_id {String}      Target peer to send message to
       * @param client_id {String}    The id of the sending client
       * @param message {Object}      The message object to send
       */
      send: function( handler_id, peer_id, client_id, message ) {
        this.socket.emit('MessageToPeer', {
          handler_id: handler_id,
          peer_id: peer_id,
          client_id: client_id,
          message: message
        });
      },

      /**
       * Receives a message from a peer listening on a handler.
       *
       * @param handler {String}      The name of the handler
       * @param callback {Function}   The callback to execute
       */
      onmessage: function( handler, callback ) {
        this.socket.on(handler, function(message) {
          callback(message);
        })
      }
    },

    /**
     *
     * @param err {String}
     */
    errorHandler: options.errorHandler || function( err ) {
      console.log(err);
    },

    /**
     * Creates a new peer connection object and attaches event handlers while updating the PeerSock's internal
     * reference with the newly created peer connection object.
     *
     * @param options {Object}
     * @param options.rtc_config {Object}       RTC configuration overrides
     * @param options.rtc_options {Object}      RTC options overrides
     * @param options.rtc_handlers {Object}     RTC event handler overrides
     * @returns {Object}
     */
    newPeerConnection: function( options ) {
      options = options || {};
      var
        pc              = new this.PeerConnection(options.rtc_config || this.rtc_config, options.rtc_options || this.rtc_options),
        handlers        = options.rtc_handlers || {},
        rtc_handlers    = {};

      // Override default handlers and set handler on connection object
      for (var handler in this.rtc_handlers) {
        rtc_handlers[handler] = handlers[handler] || this.rtc_handlers[handler];
        pc[handler] = rtc_handlers[handler];
      }

      // Add PeerSock reference to peer connection object
      pc.PeerSock = this;

      return this.pc = pc;
    },


    /**
     * Creates a new data channel on an existing connection object and attaches event handlers while adding a reference
     * to the data channel on the PeerSock objects data channel object.
     *
     * @param options {Object}
     * @param options.channel_id {String}       Identity string (arbitrary channel name)
     * @param options.connection {Object}       Peer connection object to use
     * @param options.dc_handlers {Object}      DataChannel event handler overrides
     * @returns {Object}
     */
    newDataChannel: function( options ) {
      var
        self            = this,
        pc              = options.connection || this.pc,
        handlers        = options.dc_handlers || {},
        dc_handlers     = {},

        // Generate unique channel id
        id              = function() {
          var id_gen = Math.floor(Math.random() * (10000 - 1));
          if (id_gen in self.channels) {
            id();
          } else {
            return id_gen;
          }
        }(),

        // Create data channel and store reference
        channel         = pc.createDataChannel(id, this.dc_config);

      // Extend default handlers
      for (var handler in this.dc_handlers) {
        dc_handlers[handler] = handlers[handler] || this.dc_handlers[handler];
        channel[handler] = dc_handlers[handler];
      }

      // Add PeerSock reference to data channel object
      channel.PeerSock = this;

      return this.channels[options.channel_id] = channel;
    },

    /**
     * A wrapper around peer connection object's setRemoteDescription.
     *
     * @param pc {Object}               Peer connection object to use
     * @param sdp {Object}              SDP message object to use
     * @param callback {Function}       Callback to execute
     */
    setRemoteDescription: function( pc, sdp, callback ) {
      pc.setRemoteDescription(new this.SessionDescription(sdp), function() {
        if (callback) callback(pc, sdp);
      }, this.errorHandler);
    },

    /**
     * A wrapper around peer connection object's createClientOffer.
     *
     * @param pc {Object}               Peer connection object to use
     * @param callback {Function}       Callback to execute
     */
    createClientOffer: function( pc, callback ) {
      var
        self        = this;
      pc.createOffer(function(offer) {
        pc.setLocalDescription(offer, function() {
          if (callback) callback(offer);
        }, self.errorHandler);
      }, this.errorHandler);
    },

    /**
     * A wrapper around peer connection object's answerPeerOffer.
     *
     * @param pc {Object}               Peer connection object to use
     * @param offer {Object}            SDP offer object
     * @param callback {Function}       Callback to execute
     */
    answerPeerOffer: function( pc, offer, callback ) {
      var
        self        = this;
      pc.setRemoteDescription(new this.SessionDescription(offer), function() {
        pc.createAnswer(function(answer) {
          pc.setLocalDescription(answer);
          if (callback) callback(answer);
        }, self.errorHandler);
      }, this.errorHandler);
    },

    /**
     * Handles connection negotiation and creates a new connection/data channel that defines how to respond to a message
     * from peer.
     *
     * @param options {Object}
     * @param options.channel_id {String}       Identity string (arbitrary channel name)
     * @param options.onMessage {Function}        Callback to execute on data channel's onmessage event
     */
    newListeningChannel: function( options ) {
      var
        self        = this;

      // Peers listen for offers/answers
      this.signal.onmessage(options.channel_id, function(message) {

        // SDP description
        var sdp = message.message;

        // Respond to offers
        if (sdp.type == 'offer') {

          // Build a peer connection w/ new data channel
          self.newPeerConnection({
            rtc_handlers: {
              ondatachannel: function(e) {

                // Create new data channel
                self.newDataChannel({
                  channel: e.channel,
                  channel_id: e.channel.label
                });

                // Attach channel message handler
                e.channel.onmessage = function(o) {
                  if (options.onMessage) {
                    options.onMessage.call(this, {
                      channel: e.channel,
                      message: message,
                      data: o.data,
                      peer_id: message.peer_id
                    });
                  }
                };
              }
            }
          });

          // Send peer answer
          self.client_id = message.peer_id;
          self.peer_id = message.client_id;
          self.answerPeerOffer(self.pc, sdp, function(answer) {
            self.signal.send(options.channel_id, message.peer_id, message.client_id, answer);
          });
        }

        // Set remote description with answer
        else if (sdp.type == 'answer') {
          self.setRemoteDescription(self.pc, sdp);
        }
      });
    },

    /**
     * Creates a corresponding data channel and sends an initial message to peer while defining how to respond to any
     * messages sent back.
     *
     * @param options {Object}
     * @param options.channel_id {String}
     * @param options.client_id {String}
     * @param options.peer_id {String}
     */
    startListeningChannel: function( options ) {
      var
        self        = this,
        init        = this.pc ? true : false,
        identity    = function() {},
        onOpen      = options.onOpen || identity,
        onMessage   = options.onMessage || identity,
        onClose     = options.onClose || identity,
        onError     = options.onError || identity;

      // Create peer connection
      if (!init) this.newPeerConnection();

      // Create datachannel
      this.newDataChannel({
        channel_id: options.channel_id,
        connection: self.pc,
        dc_handlers: {
          onopen: function(e) {
            onOpen.call(this, {
              channel: self.channels[options.channel_id],
              peer_id: options.peer_id,
              event: e
            });
          },
          onmessage: function(e) {
            onMessage.call(this, {
              channel: self.channels[options.channel_id],
              peer_id: options.peer_id,
              data: e.data,
              event: e
            });
          },
          onclose: function(e) {
            onClose.call(this, {
              channel: self.channels[options.channel_id],
              peer_id: options.peer_id,
              event: e
            });
          },
          onerror: function(e) {
            onError.call(this, {
              channel: self.channels[options.channel_id],
              peer_id: options.peer_id,
              event: e
            });
          }
        }
      });

      // Send connection offer to peer & reference socket ids
      this.client_id = options.client_id;
      this.peer_id = options.peer_id;
      //if (!init) {
        this.createClientOffer(this.pc, function(offer) {
          self.signal.send(options.channel_id, options.peer_id, options.client_id, offer);
        });
      //}
    }

  });
};
