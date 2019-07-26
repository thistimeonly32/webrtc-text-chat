"use strict";

var localPC;
var remotePC;
var localChnl;
var remoteChnl;
var pcConstraint;
var dataConstraint;
var callButton = document.querySelector("button#callButton");
var connectButton = document.querySelector("button#connectButton");
var closeButton = document.querySelector("button#closeButton");
var socket;
var stompClient;

const mediaStreamConstraints = {
  audio: true,
  video:  false
};

// Set up to exchange only video.
const offerOptions = {
  offerToReceiveVideo: 1,
};

// Define peer connections, streams and video elements.
const remoteAudio = document.getElementById('remoteAudio');
const localVideo = document.getElementById('localAudio');

let localStream;
let remoteStream;

$(document).ready(function() {
  bindEvents();
});

function gotLocalMediaStream(mediaStream) {
  localAudio.srcObject = mediaStream;
  localStream = mediaStream;
  trace('Received local stream.');
}

// Handles error by logging a message to the console.
function handleLocalMediaStreamError(error) {
  trace(`navigator.getUserMedia error: ${error.toString()}.`);
}

// Handles remote MediaStream success by adding it as the remoteVideo src.
function gotRemoteMediaStream(event) {
  const mediaStream = event.stream;
  remoteAudio.srcObject = mediaStream;
  remoteStream = mediaStream;
  trace('Remote peer connection received remote stream.');
}

function startAction() {
  navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
    .then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
  trace('Requesting local stream.');
}

function getQueryStringValue(key) {
  return decodeURIComponent(
    window.location.search.replace(
      new RegExp(
        "^(?:.*[&\\?]" +
          encodeURIComponent(key).replace(/[\.\+\*]/g, "\\$&") +
          "(?:\\=([^&]*))?)?.*$",
        "i"
      ),
      "$1"
    )
  );
}

function bindEvents() {
  callButton.onclick = sendData;
  connectButton.onclick = startAction;
  closeButton.onclick = closeConnection;

  var servers = null;
  pcConstraint = null;
  dataConstraint = null;
  trace("Using SCTP based data channels");
  // For SCTP, reliable and ordered delivery is true by default.
  // Add User1Connection to global scope to make it visible
  // from the browser console.
  window.localPC = localPC = new RTCPeerConnection(servers, pcConstraint);
  trace("Created user 1 peer connection object");

  if (getQueryStringValue("userId") == 1) {
    localChnl = localPC.createDataChannel(
      `localChnl${getQueryStringValue("userId")}`,
      dataConstraint
    );
    trace("Created user 1 channel");
  }
  if (getQueryStringValue("userId") == 1) {
    localChnl.onmessage = onUser1MsgCB;
  }
  

  localPC.onicecandidate = user1ICECB;
  localPC.onopen = onUser1ChnlStateChange;
  localPC.onclose = onUser1ChnlStateChange;

  localPC.ondatachannel = user2ChnlCB;

  socket = new SockJS(
    `http://localhost:8080/ossnapi-websocket?userId=${getQueryStringValue(
      "userId"
    )}`
  );
  stompClient = Stomp.over(socket);
  stompClient.connect({}, function(frame) {
    console.log("Connected msg: " + frame);

    stompClient.subscribe("/user/queue/private/sdp", res => {
      console.log("got private sdp response: " + res);
      console.log(res);
      console.log("desc object: " + res.body.toString());
      console.log(res.body.toString());
      console.log(typeof JSON.parse(res.body.toString()));
      console.log(JSON.parse(res.body.toString()));
      console.log(new RTCSessionDescription(JSON.parse(res.body.toString())));
      localPC.setRemoteDescription(
        new RTCSessionDescription(JSON.parse(res.body.toString()))
      );

      if (getQueryStringValue("userId") == 2) {
        localPC
          .createAnswer()
          .then(gotDescriptionUser2, onCreateSessionDescriptionError);
      }
    });

    stompClient.subscribe("/user/queue/private/ice", res => {
      console.log("got private ice response: " + res);
      console.log(res);
      console.log("ice object: " + res.body.toString());
      console.log(res.body.toString());
      console.log(typeof JSON.parse(res.body.toString()));
      console.log(JSON.parse(res.body.toString()));
      localPC
        .addIceCandidate(new RTCIceCandidate(JSON.parse(res.body.toString())))
        .then(onAddIceCandidateSuccess, onAddIceCandidateError);
    });
  });
}

function closeConnection() {}

function connectChat() {
  console.log("connect button");

  

  // Add User2Connection to global scope to make it visible
  // from the browser console.

  // window.user2PC = user2PC =
  //     new RTCPeerConnection(servers, pcConstraint);
  // trace('Created user 2 peer connection object');

  // user2PC.onicecandidate = user2ICECB;

  localPC
    .createOffer()
    .then(gotDescriptionUser1, onCreateSessionDescriptionError);
}

function startConnection() {
  var servers = null;
  pcConstraint = null;
  dataConstraint = null;
  trace("Using SCTP based data channels");
  // For SCTP, reliable and ordered delivery is true by default.
  // Add User1Connection to global scope to make it visible
  // from the browser console.
  window.user1PC = user1PC = new RTCPeerConnection(servers, pcConstraint);
  trace("Created user 1 peer connection object");

  user1Chnl = user1PC.createDataChannel("user1Chnl", dataConstraint);
  trace("Created user 1 channel");
  user1Chnl.onmessage = onUser1MsgCB;

  user1PC.onicecandidate = user1ICECB;
  user1PC.onopen = onUser1ChnlStateChange;
  user1PC.onclose = onUser1ChnlStateChange;

  // Add User2Connection to global scope to make it visible
  // from the browser console.
  window.user2PC = user2PC = new RTCPeerConnection(servers, pcConstraint);
  trace("Created user 2 peer connection object");

  user2PC.onicecandidate = user2ICECB;
  user2PC.ondatachannel = user2ChnlCB;

  user1PC
    .createOffer()
    .then(gotDescriptionUser1, onCreateSessionDescriptionError);
}

function gotDescriptionUser1(desc) {
  trace("Offer from local \n" + desc.sdp);
  console.log(desc);
  console.log(typeof desc);
  console.log("desc object: " + desc);

  localPC.setLocalDescription(desc);
  stompClient.send("/user/2/queue/private/sdp", {}, JSON.stringify(desc));
}

function gotDescriptionUser2(desc) {
  // user2PC.setLocalDescription(desc);
  trace("Answer from user2 \n" + desc.sdp);
  // user1PC.setRemoteDescription(desc);

  localPC.setLocalDescription(desc);
  stompClient.send("/user/1/queue/private/sdp", {}, JSON.stringify(desc));
}

function onCreateSessionDescriptionError(error) {
  trace("Failed to create session description: " + error.toString());
}

function user1ICECB(event) {
  trace("local ice callback");
  if (event.candidate) {
    console.log(event.candidate);
    console.log(typeof event.candidate);
    console.log("ice object: " + event.candidate);
    if (getQueryStringValue("userId") == 1) {
      stompClient.send(
        "/user/2/queue/private/ice",
        {},
        JSON.stringify(event.candidate)
      );
    } else {
      stompClient.send(
        "/user/1/queue/private/ice",
        {},
        JSON.stringify(event.candidate)
      );
    }
    trace("User1 ICE candidate: \n" + event.candidate.candidate);
  }
}

function user2ICECB(event) {
  trace("user2 ice callback");
  if (event.candidate) {
    user1PC
      .addIceCandidate(event.candidate)
      .then(onAddIceCandidateSuccess, onAddIceCandidateError);
    trace("user2 ICE candidate: \n " + event.candidate.candidate);
  }
}

function onAddIceCandidateSuccess() {
  trace("AddIceCandidate success.");
}

function onAddIceCandidateError(error) {
  trace("Failed to add Ice Candidate: " + error.toString());
}

function user2ChnlCB(event) {
  trace("Receive user 2 Channel Callback");
  localChnl = event.channel;
  localChnl.onmessage = onUser2MsgCB;
  localChnl.onopen = onUser2ChnlStateChange;
  localChnl.onclose = onUser2ChnlStateChange;
}

function onUser1MsgCB(event) {
  trace("user 1 Message received");
  // user2ChatBox.innerHTML = user1ChatBox.innerHTML = event.data;
  $("#chatBox").append(
    `<div class="user2" ><div><b>user2: </b></div>${event.data}</div>`
  );
  // $("#chatBox").append(
  //   `<div><div><b>user2: </b></div>${event.data}</div>`
  // );
}

function onUser2MsgCB(event) {
  trace("user 2 Message received");
  // $("#chatBox").append(
  //   `<div><div><b>user1: </b></div>${event.data}</div>`
  // );
  $("#chatBox").append(
    `<div class="user2" ><div><b>user1: </b></div>${event.data}</div>`
  );
}

function sendData() {
  var user1data = dataChannel.value;
  localChnl.send(user1data);

  trace("user1 data sent: " + user1data);
}

// function user2SendData() {
//   var user2data = dataChannel.value;
//   localChnl.send(user2data);
//   trace("user1 data sent: " + user2data);
// }

function onUser1ChnlStateChange() {
  var readyState = localChnl.readyState;
  trace("Send channel state is: " + readyState);
}

function onUser2ChnlStateChange() {
  var readyState = localChnl.readyState;
  trace("Receive channel state is: " + readyState);
}

function trace(text) {
  if (text[text.length - 1] === "\n") {
    text = text.substring(0, text.length - 1);
  }
  if (window.performance) {
    var now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ": " + text);
  } else {
    console.log(text);
  }
}

