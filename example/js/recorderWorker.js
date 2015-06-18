

var recLength = 0,
  recBuffersL = [],
  recBuffersR = [],
  bits        = 16,
  sampleRate;

var mp3Encoder;



this.onmessage = function(e){
  switch(e.data.command){
    case 'init':
      init(e.data.config);
      break;
    case 'record':
      record(e.data.buffer);
      break;
    case 'exportWAV':
      exportWAV(e.data.type);
      break;
    case 'getBuffer':
      getBuffer();
      break;

    case 'exportMP3':
      exportMP3();
      break;
    case 'clear':
      clear();
      break;
  }
};

function init(config){
  sampleRate = config.sampleRate;
  mp3Encoder = new MP3Encoder({ mp3LibPath: config.mp3LibPath});
}

function record(inputBuffer){
  recBuffersL.push(inputBuffer[0]);
  //recBuffersR.push(inputBuffer[1]);
  recLength += inputBuffer[0].length;
}

function exportWAV(type){
  var bufferL = mergeBuffers(recBuffersL, recLength);
  //var bufferR = mergeBuffers(recBuffersR, recLength);
  //var interleaved = interleave(bufferL, bufferR);
  //var dataview = encodeWAV(interleaved);
  var dataview = encodeWAV(bufferL);
  var audioBlob = new Blob([dataview], { type: type });

  this.postMessage(audioBlob);
}

function exportMP3(){

  var bufferL = mergeBuffers(recBuffersL, recLength);

  var mp3Blob = mp3Encoder.toFile(bufferL, { mode : 3,  channels:1});

   this.postMessage(mp3Blob);



};




function getBuffer() {
  var buffers = [];
  buffers.push( mergeBuffers(recBuffersL, recLength) );
  buffers.push( mergeBuffers(recBuffersR, recLength) );
  this.postMessage(buffers);
}

function clear(){
  recLength = 0;
  recBuffersL = [];
  recBuffersR = [];
}

function mergeBuffers(recBuffers, recLength){
  var result = new Float32Array(recLength);
  var offset = 0;
  for (var i = 0; i < recBuffers.length; i++){
    result.set(recBuffers[i], offset);
    offset += recBuffers[i].length;
  }
  return result;
}

function interleave(inputL, inputR){
  var length = inputL.length + inputR.length;
  var result = new Float32Array(length);

  var index = 0,
    inputIndex = 0;

  while (index < length){
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function floatTo16BitPCM(output, offset, input){
  for (var i = 0; i < input.length; i++, offset+=2){
    var s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view, offset, string){
  for (var i = 0; i < string.length; i++){
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}




function encodeWAV(samples){
  var buffer = new ArrayBuffer(44 + samples.length * 2);
  var view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 32 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  //view.setUint16(22, 2, true); /*STEREO*/
  view.setUint16(22, 1, true); /*MONO*/
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  //view.setUint32(28, sampleRate * 4, true); /*STEREO*/
  view.setUint32(28, sampleRate * 2, true); /*MONO*/
  /* block align (channel count * bytes per sample) */
  //view.setUint16(32, 4, true); /*STEREO*/
  view.setUint16(32, 2, true); /*MONO*/
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);

  return view;
}



var MP3Encoder = function (config) {


  config = config ||{};
  var libLamePath = config.mp3LibPath || 'libmp3lame.min.js';
  importScripts(libLamePath);

  var mp3codec;

  function init (config){

      config = config || {};

      mp3codec = Lame.init();
      Lame.set_mode(mp3codec, config.mode || Lame.JOINT_STEREO);
      Lame.set_num_channels(mp3codec, config.channels || 2);
      Lame.set_num_samples(mp3codec, config.samples || -1);
      Lame.set_in_samplerate(mp3codec, config.samplerate || 44100);
      Lame.set_out_samplerate(mp3codec, config.samplerate || 44100);
      Lame.set_bitrate(mp3codec, config.bitrate || 128);
      Lame.init_params(mp3codec);


  };

  function encode (buffer, config){

    init(config);

    var mp3data = Lame.encode_buffer_ieee_float(mp3codec, buffer, buffer);
    Lame.encode_flush(mp3codec);
    Lame.close(mp3codec);
    mp3codec = null;

    return mp3data;


  };


  function toFile(buffer, config){

    var mp3data = encode(buffer, config);

    var mp3Blob = new Blob([mp3data.data], {type: 'audio/mp3'});


    return mp3Blob;



  };



    this.encode = encode;
    this.toFile = toFile;


};



