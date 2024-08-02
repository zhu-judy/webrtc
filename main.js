let peerConnection;
let localStream;
let remoteStream;

let servers = {
  iceServers: [
    {
      urls: "turn:106.14.186.140:4477?transport=tcp",
      username: "aaa",
      credential: "aaa",
      
    },

    // {
    //     urls: 'turn:192.168.1.222:3478?transport=tcp',
    //     username: 'aaa',
    //     credential: 'aaa'
    // }
  ],
};

let init = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });
  document.getElementById("user-1").srcObject = localStream;

  //    remoteStream = new MediaStream()
  //    document.getElementById('user-2').srcObject = remoteStream
};

let createPeerConnection = async (sdpType) => {
  peerConnection = new RTCPeerConnection(servers);

  console.log("Add localStream to peerConnection.");
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  remoteStream = new MediaStream();
  document.getElementById("user-2").srcObject = remoteStream;
  peerConnection.ontrack = async (event) => {
    console.log("Add remoteStream to peerConnection.");
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      console.log("New ICE candidate added.", event.candidate);
      document.getElementById(sdpType).value = JSON.stringify(
        peerConnection.localDescription
      );
    }
  };
};

let createOffer = async () => {
  console.log("Creating offer-sdp.");
  createPeerConnection("offer-sdp");

  let offer = await peerConnection.createOffer();
  console.log("offer-sdp Created.");
  document.getElementById("offer-sdp").value = JSON.stringify(offer);

  console.log("set offer-sdp to LocalDescription.");
  await peerConnection.setLocalDescription(offer);
};

let createAnswer = async () => {
  console.log("Creating answer-sdp.");
  createPeerConnection("answer-sdp");

  let offer = document.getElementById("offer-sdp").value;
  if (!offer) return alert("Retrieve offer from peer first...");

  offer = JSON.parse(offer);
  console.log("set offer-sdp to RemoteDescription.");
  await peerConnection.setRemoteDescription(offer);

  let answer = await peerConnection.createAnswer();
  console.log("answer-sdp Created.");
  document.getElementById("answer-sdp").value = JSON.stringify(answer);

  console.log("set answer-sdp to LocalDescription.");
  await peerConnection.setLocalDescription(answer);
};

let addAnswer = async () => {
  console.log("Adding answer-sdp.");

  let answer = document.getElementById("answer-sdp").value;
  if (!answer) return alert("Retrieve answer from peer first...");

  answer = JSON.parse(answer);

  if (!peerConnection.currentRemoteDescription) {
    console.log("set answer-sdp to RemoteDescription.");
    peerConnection.setRemoteDescription(answer);
  }
};

init();

document.getElementById("create-offer").addEventListener("click", createOffer);
document
  .getElementById("create-answer")
  .addEventListener("click", createAnswer);
document.getElementById("add-answer").addEventListener("click", addAnswer);
