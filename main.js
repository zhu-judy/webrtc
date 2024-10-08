let peerConnection;
let localStream;
let remoteStream;
let remoteEndpoint;
let offerSdp;

let servers = {
  iceServers: [
    { url: 'stun:stun.gmx.net:3478' },
    { url: 'stun:stun.l.google.com:19302' },
    { url: 'stun:stun1.l.google.com:19302' },
    { url: 'stun:stun2.l.google.com:19302' },
    { url: 'stun:stun3.l.google.com:19302' },
  ]
};
let mgtUrl = "http://130.147.232.250:5000";
function toggleVideo() {
  if (localStream && localStream.getVideoTracks().length > 0) {
    var videoTrack = localStream.getVideoTracks()[0];
    // Toggle the enabled property
    videoTrack.enabled = !videoTrack.enabled;
    if(videoTrack.enabled) {
      document.getElementById("videoOn").style.display = 'inline'
      document.getElementById("videoOff").style.display = 'none'
    } else {
      document.getElementById("videoOn").style.display = 'none'
      document.getElementById("videoOff").style.display = 'inline'
    }
  } else {
    console.error("No video track available to toggle.");
  }
}

function toggleAudio() {
  if (localStream && localStream.getAudioTracks().length > 0) {
    var audioTrack = localStream.getAudioTracks()[0];
    // Toggle the enabled property
    audioTrack.enabled = !audioTrack.enabled;
    if(audioTrack.enabled) {
      document.getElementById("audioOn").style.display = 'inline'
      document.getElementById("audioOff").style.display = 'none'
    } else {
      document.getElementById("audioOn").style.display = 'none'
      document.getElementById("audioOff").style.display = 'inline'
    }
  } else {
    console.error("No audio track available to toggle.");
  }
}
function requestToCall() {
  sendMsg({msg: {
    type: 'requestCall',
    data: 'request to call'
  }}).then(res => {
    document.getElementById("create-offer").style.display = "none";
    document.getElementById("wait-to-agree").style.display = "block";
    document.getElementById("reject").style.display = "none";


  })
}
function volumeDomRender() {
  const volumeControl = document.getElementById('volumeControl');
  const volumeSlider = document.getElementById('volume');
  const volumeOff = document.getElementById('volumeOff');
  const volumeOn = document.getElementById('volumeOn');
  volumeOn.addEventListener('click', () => {
    document.getElementById("user-2").volume = 0
    volumeSlider.value = 0

    volumeOff.style.display ='block'
    volumeOn.style.display='none'

  })
  volumeOff.addEventListener('click', () => {
    document.getElementById("user-2").volume = 1
    volumeSlider.value = 1

    volumeOff.style.display ='none'
    volumeOn.style.display='block'

  })
  
  volumeControl.addEventListener('mouseenter', () => {
      volumeSlider.style.display = 'block';
  });
  
  volumeControl.addEventListener('mouseleave', () => {
      volumeSlider.style.display = 'none';
  });
  volumeSlider.addEventListener('input', function() {
    if(this.value == 0) {
      volumeOff.style.display ='block'
      volumeOn.style.display='none'
    } else {
      volumeOff.style.display ='none'
      volumeOn.style.display='block'
    }
    document.getElementById("user-2").volume = this.value

  });
}

const initStream = async () => {
  try {
    remoteStream = new MediaStream();
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    
    toggleAudio();
    document.getElementById("user-2").srcObject = remoteStream;

    document.getElementById("user-1").srcObject = localStream;
    document.getElementById("user-1").muted = true
    document.getElementById("user-1").volume = 0

    console.log("finish init local stream")
    return localStream
  } catch (error) {
    alert("cannot get your camera!");
    console.log('get camera error', error)
  }
};
let init = async () => {

  const eventSource = new EventSource("http://130.147.232.250:5000/api/events"); // Replace with your actual SSE endpoint
  eventSource.onopen = () => {
    console.log("open event");
  };
  eventSource.onmessage = handleSignalingMessage;
  eventSource.onerror = (error) => {
    console.error("EventSource failed:", error);
    eventSource.close();
  };
  await initStream()
  volumeDomRender()
};

const handleSignalingMessage = async (event) => {
  const message = event.data;

  if (message instanceof Blob) {
    const text = await message.text();
    const data = JSON.parse(text);
    handleMessageFromPeer(data);
  } else {
    const data = JSON.parse(message);
    handleMessageFromPeer(data);
  }
};
let handleMessageFromPeer = async (message) => {
  if (message.type === "close") {
    closeWebRtc()
  }
  if (message.type === "requestCall") {
    sendMsg({msg: {
      type: 'startCall',
      data: 'start to call'
    }})
  }
  if(message.type === 'reject') {
    hiddenVideo();
    document.getElementById("reject").style.display = "block";
    document.getElementById("wait-to-agree").style.display = "none";


  }
  if(message.type === 'startCall') {
    document.getElementById("reject").style.display = "none";

    showVideo();
    createOffer()
  }
  if (message.type === "offer") {
    showVideo();

    // offerSdp = JSON.stringify(message);
    createAnswer(message);
  } else if (message.type === "answer") {
    // document.getElementById("answer-sdp").value = JSON.stringify(message);
    addAnswer(message);
  } else if (message.candidate){
    if (peerConnection) {
      peerConnection.addIceCandidate(message);
    }
  }
};


let sendMsg = async (data) => {
  (data.to = remoteEndpoint), console.log(data);
  return fetch(mgtUrl + "/api/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
};

let createPeerConnection = async (sdpType) => {
  if (!localStream) {
    localStream = await initStream();
  }
  peerConnection = new RTCPeerConnection(servers);

  console.log("Add localStream to peerConnection.");
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = async (event) => {
    console.log("Add remoteStream to peerConnection.");
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onconnectionstatechange = () => {
    console.log('state change:', peerConnection.connectionState)
    // if (peerConnection.connectionState == "disconnected") {
    //   peerConnection.close();
    //   hiddenVideo();
    // }
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      console.log("New ICE candidate added.", event.candidate);
      await sendMsg({
        msg: event.candidate,
      });
    }
  };
  return peerConnection
};

let showVideo = () => {
  const videos = document.getElementById("onCall");
  videos.style.display = "flex";
  document.getElementById("create-offer").style.display = "none";
  document.getElementById("wait-to-agree").style.display = "none";
  document.getElementById("reject").style.display = "none";
};
let hiddenVideo = () => {
  const videos = document.getElementById("onCall");
  videos.style.display = "none";
  document.getElementById("create-offer").style.display = "block";
  document.getElementById("wait-to-agree").style.display = "none";
  document.getElementById("reject").style.display = "none";
};

let createOffer = async () => {
  showVideo();
  await createPeerConnection("offer-sdp");
  let offer = await peerConnection.createOffer();
  console.log("offer-sdp Created.");
  console.log("set offer-sdp to LocalDescription.");
  await peerConnection.setLocalDescription(offer);
  await sendMsg({
    msg: offer,
  });
};

let createAnswer = async (offer) => {
  console.log("Creating answer-sdp.");
  await createPeerConnection("answer-sdp");

  if (!offer) return alert("Retrieve offer from peer first...");
  console.log("set offer-sdp to RemoteDescription.");
  await peerConnection.setRemoteDescription(offer);

  let answer = await peerConnection.createAnswer();
  console.log("set answer-sdp to LocalDescription.");
  await peerConnection.setLocalDescription(answer);
  await sendMsg({
    msg: answer,
  });
};

let addAnswer = async (answer) => {
  console.log("Adding answer-sdp.");
  if (!answer) return alert("Retrieve answer from peer first...");
  if (!peerConnection.currentRemoteDescription) {
    console.log("set answer-sdp to RemoteDescription.");
    peerConnection.setRemoteDescription(answer);
  }
};

const closeWebRtc = async () => {
  if (peerConnection) {
    hiddenVideo();
    console.log("close connection .");
    // Close each track
    peerConnection.getLocalStreams().forEach((mediaStream) => {
      mediaStream.getVideoTracks().forEach((it) => it.stop());
      mediaStream.getAudioTracks().forEach((it) => it.stop());
    });

    // Close the connection
    peerConnection.close();

    // Nullify the reference
    peerConnection = null;
    localStream = null;
    remoteStream = null;
  }
};

const hangUp = () => {
  closeWebRtc()
  sendMsg({
    msg: {
      type: "close"
    }
  })
}

init();

document.getElementById("create-offer").addEventListener("click", requestToCall);

document.getElementById("hangUp").addEventListener("click", hangUp);
document.getElementById("toggleVideo").addEventListener("click", toggleVideo);
document.getElementById("toggleAudio").addEventListener("click", toggleAudio);
