'use strict';

var localPC;
var remotePC;
var localChnl;
var remoteChnl;
var pcConstraint
var dataConstraint;
var chatBox = document.querySelector('div#chatBox');
var dataChannel = document.querySelector('input#dataChannel');
var sendButton = document.querySelector('button#user1SendButton');
var connectButton = document.querySelector('button#connectButton');
var closeButton = document.querySelector('button#closeButton');
// var socket;
// var stompClient;

$(document).ready(function () {
    bindEvents();
});

function getQueryStringValue(key) {
    return decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
}

function bindEvents() {
    // sendButton.onclick = sendMessage;
    connectButton.onclick = connectChat;
    closeButton.onclick = closeConnection;
}

function closeConnection() {

}

function connectChat() {
    console.log('connect button');
    var socket = new SockJS(`http://localhost:8080/ossnapi-websocket?userId=${getQueryStringValue('userId')}`);
    var stompClient = Stomp.over(socket);
    stompClient.connect({}, function (frame) {
        console.log('Connected msg: ' + frame);
    });
}

function startConnection() {
    var servers = null;
    pcConstraint = null;
    dataConstraint = null;
    trace('Using SCTP based data channels');
    // For SCTP, reliable and ordered delivery is true by default.
    // Add User1Connection to global scope to make it visible
    // from the browser console.
    window.user1PC = user1PC =
        new RTCPeerConnection(servers, pcConstraint);
    trace('Created user 1 peer connection object');

    user1Chnl = user1PC.createDataChannel('user1Chnl',
        dataConstraint);
    trace('Created user 1 channel');
    user1Chnl.onmessage = onUser1MsgCB;

    user1PC.onicecandidate = user1ICECB;
    user1PC.onopen = onUser1ChnlStateChange;
    user1PC.onclose = onUser1ChnlStateChange;

    // Add User2Connection to global scope to make it visible
    // from the browser console.
    window.user2PC = user2PC =
        new RTCPeerConnection(servers, pcConstraint);
    trace('Created user 2 peer connection object');

    user2PC.onicecandidate = user2ICECB;
    user2PC.ondatachannel = user2ChnlCB;

    user1PC.createOffer().then(
        gotDescriptionUser1,
        onCreateSessionDescriptionError
    );

}

function gotDescriptionUser1(desc) {
    user1PC.setLocalDescription(desc);
    trace('Offer from user1 \n' + desc.sdp);
    user2PC.setRemoteDescription(desc);
    user2PC.createAnswer().then(
        gotDescriptionUser2,
        onCreateSessionDescriptionError
    );
}

function gotDescriptionUser2(desc) {
    user2PC.setLocalDescription(desc);
    trace('Answer from user2 \n' + desc.sdp);
    user1PC.setRemoteDescription(desc);
}

function onCreateSessionDescriptionError(error) {
    trace('Failed to create session description: ' + error.toString());
}

function user1ICECB(event) {
    trace('user1 ice callback');
    if (event.candidate) {
        user2PC.addIceCandidate(
            event.candidate
        ).then(
            onAddIceCandidateSuccess,
            onAddIceCandidateError
        );
        trace('User1 ICE candidate: \n' + event.candidate.candidate);
    }
}

function user2ICECB(event) {
    trace('user2 ice callback');
    if (event.candidate) {
        user1PC.addIceCandidate(
            event.candidate
        ).then(
            onAddIceCandidateSuccess,
            onAddIceCandidateError
        );
        trace('user2 ICE candidate: \n ' + event.candidate.candidate);
    }
}

function onAddIceCandidateSuccess() {
    trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
    trace('Failed to add Ice Candidate: ' + error.toString());
}


function user2ChnlCB(event) {
    trace('Receive user 2 Channel Callback');
    user2Chnl = event.channel;
    user2Chnl.onmessage = onUser2MsgCB;
    user2Chnl.onopen = onUser2ChnlStateChange;
    user2Chnl.onclose = onUser2ChnlStateChange;

}

function onUser1MsgCB(event) {
    trace('user 1 Message received');
    // user2ChatBox.innerHTML = user1ChatBox.innerHTML = event.data;
    $('#user1ChatBox').append(`<div class="user2" ><div><b>user2: </b></div>${event.data}</div>`);
    $('#user2ChatBox').append(`<div><div><b>user2: </b></div>${event.data}</div>`);
}

function onUser2MsgCB(event) {
    trace('user 2 Message received');
    $('#user1ChatBox').append(`<div><div><b>user1: </b></div>${event.data}</div>`);
    $('#user2ChatBox').append(`<div class="user2" ><div><b>user1: </b></div>${event.data}</div>`);
}

function user1SendData() {
    var user1data = user1DataChnl.value;
    user1Chnl.send(user1data);

    trace('user1 data sent: ' + user1data);
}

function user2SendData() {
    var user2data = user2DataChnl.value;
    user2Chnl.send(user2data);
    trace('user1 data sent: ' + user2data);
}

function onUser1ChnlStateChange() {
    var readyState = user1Chnl.readyState;
    trace('Send channel state is: ' + readyState);
}

function onUser2ChnlStateChange() {
    var readyState = user2Chnl.readyState;
    trace('Receive channel state is: ' + readyState);
}

function trace(text) {
    if (text[text.length - 1] === '\n') {
        text = text.substring(0, text.length - 1);
    }
    if (window.performance) {
        var now = (window.performance.now() / 1000).toFixed(3);
        console.log(now + ': ' + text);
    } else {
        console.log(text);
    }
}

// var localConnection;
// var remoteConnection;
// var sendChannel;
// var receiveChannel;
// var pcConstraint;
// var dataConstraint;
// var dataChannelSend = document.querySelector('textarea#dataChannelSend');
// var dataChannelReceive = document.querySelector('textarea#dataChannelReceive');
// var startButton = document.querySelector('button#startButton');
// var sendButton = document.querySelector('button#sendButton');
// var closeButton = document.querySelector('button#closeButton');

// startButton.onclick = createConnection;
// sendButton.onclick = sendData;
// closeButton.onclick = closeDataChannels;

// function enableStartButton() {
//     startButton.disabled = false;
// }

// function disableSendButton() {
//     sendButton.disabled = true;
// }

// function createConnection() {
//     dataChannelSend.placeholder = '';
//     var servers = null;
//     pcConstraint = null;
//     dataConstraint = null;
//     trace('Using SCTP based data channels');
//     // For SCTP, reliable and ordered delivery is true by default.
//     // Add localConnection to global scope to make it visible
//     // from the browser console.
//     window.localConnection = localConnection =
//         new RTCPeerConnection(servers, pcConstraint);
//     trace('Created local peer connection object localConnection');

//     sendChannel = localConnection.createDataChannel('sendDataChannel',
//         dataConstraint);
//     trace('Created send data channel');

//     localConnection.onicecandidate = iceCallback1;
//     sendChannel.onopen = onSendChannelStateChange;
//     sendChannel.onclose = onSendChannelStateChange;

//     // Add remoteConnection to global scope to make it visible
//     // from the browser console.
//     window.remoteConnection = remoteConnection =
//         new RTCPeerConnection(servers, pcConstraint);
//     trace('Created remote peer connection object remoteConnection');

//     remoteConnection.onicecandidate = iceCallback2;
//     remoteConnection.ondatachannel = receiveChannelCallback;

//     localConnection.createOffer().then(
//         gotDescription1,
//         onCreateSessionDescriptionError
//     );
//     startButton.disabled = true;
//     closeButton.disabled = false;
// }

// function onCreateSessionDescriptionError(error) {
//     trace('Failed to create session description: ' + error.toString());
// }

// function sendData() {
//     var data = dataChannelSend.value;
//     sendChannel.send(data);
//     trace('Sent Data: ' + data);
// }

// function closeDataChannels() {
//     trace('Closing data channels');
//     sendChannel.close();
//     trace('Closed data channel with label: ' + sendChannel.label);
//     receiveChannel.close();
//     trace('Closed data channel with label: ' + receiveChannel.label);
//     localConnection.close();
//     remoteConnection.close();
//     localConnection = null;
//     remoteConnection = null;
//     trace('Closed peer connections');
//     startButton.disabled = false;
//     sendButton.disabled = true;
//     closeButton.disabled = true;
//     dataChannelSend.value = '';
//     dataChannelReceive.value = '';
//     dataChannelSend.disabled = true;
//     disableSendButton();
//     enableStartButton();
// }

// function gotDescription1(desc) {
//     localConnection.setLocalDescription(desc);
//     trace('Offer from localConnection \n' + desc.sdp);
//     remoteConnection.setRemoteDescription(desc);
//     remoteConnection.createAnswer().then(
//         gotDescription2,
//         onCreateSessionDescriptionError
//     );
// }

// function gotDescription2(desc) {
//     remoteConnection.setLocalDescription(desc);
//     trace('Answer from remoteConnection \n' + desc.sdp);
//     localConnection.setRemoteDescription(desc);
// }

// function iceCallback1(event) {
//     trace('local ice callback');
//     if (event.candidate) {
//         remoteConnection.addIceCandidate(
//             event.candidate
//         ).then(
//             onAddIceCandidateSuccess,
//             onAddIceCandidateError
//         );
//         trace('Local ICE candidate: \n' + event.candidate.candidate);
//     }
// }

// function iceCallback2(event) {
//     trace('remote ice callback');
//     if (event.candidate) {
//         localConnection.addIceCandidate(
//             event.candidate
//         ).then(
//             onAddIceCandidateSuccess,
//             onAddIceCandidateError
//         );
//         trace('Remote ICE candidate: \n ' + event.candidate.candidate);
//     }
// }

// function onAddIceCandidateSuccess() {
//     trace('AddIceCandidate success.');
// }

// function onAddIceCandidateError(error) {
//     trace('Failed to add Ice Candidate: ' + error.toString());
// }

// function receiveChannelCallback(event) {
//     trace('Receive Channel Callback');
//     receiveChannel = event.channel;
//     receiveChannel.onmessage = onReceiveMessageCallback;
//     receiveChannel.onopen = onReceiveChannelStateChange;
//     receiveChannel.onclose = onReceiveChannelStateChange;
// }

// function onReceiveMessageCallback(event) {
//     trace('Received Message');
//     dataChannelReceive.value = event.data;
// }

// function onSendChannelStateChange() {
//     var readyState = sendChannel.readyState;
//     trace('Send channel state is: ' + readyState);
//     if (readyState === 'open') {
//         dataChannelSend.disabled = false;
//         dataChannelSend.focus();
//         sendButton.disabled = false;
//         closeButton.disabled = false;
//     } else {
//         dataChannelSend.disabled = true;
//         sendButton.disabled = true;
//         closeButton.disabled = true;
//     }
// }

// function onReceiveChannelStateChange() {
//     var readyState = receiveChannel.readyState;
//     trace('Receive channel state is: ' + readyState);
// }

// function trace(text) {
//     if (text[text.length - 1] === '\n') {
//         text = text.substring(0, text.length - 1);
//     }
//     if (window.performance) {
//         var now = (window.performance.now() / 1000).toFixed(3);
//         console.log(now + ': ' + text);
//     } else {
//         console.log(text);
//     }
// }
