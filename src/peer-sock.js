var PeerSock = (function(ps) {
  ps.connection = function(id, options) {
    return {
      id: id,

      // Peer connection ref
      pc: null,

      // Data channel refs
      channels: {}
    };
  };

  return ps;
}(PeerSock || {}));
