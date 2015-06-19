(function(window){

  var WORKER_PATH = 'js/recorderWorker.js';


	function RecorderObject (source, cfg){

		var config = cfg || {};
		var recording = false, initialized=false,
			currCallback, worker;

		var bufferLen = config.bufferLen || 4096;
		this.context = source.context;
		this.node = (this.context.createScriptProcessor ||
		this.context.createJavaScriptNode).call(this.context,
			bufferLen, 2, 2);
		worker = new Worker(config.workerPath || WORKER_PATH);
		var mp3LibPath = config.mp3LibPath || 'lame.all.js';
		var vorbisLibPath = config.vorbisLibPath || 'libvorbis.module.min.js';

		worker.onmessage = function(e){
			var blob = e.data;
			currCallback(blob);
		};

		worker.postMessage({
			command: 'init',
			config: {
				sampleRate: this.context.sampleRate,
				mp3LibPath: mp3LibPath,
				vorbisLibPath: vorbisLibPath,
				recordAsMP3: config.recordAsMP3 || false,
				recordAsOGG: config.recordAsOGG || false
			}
		});



		this.configure = function(cfg){
			for (var prop in cfg){
				if (cfg.hasOwnProperty(prop)){
					config[prop] = cfg[prop];
				}
			}
		};


		this.record = function(){
			recording = true;
		};

		this.stop = function(){
			recording = false;
		};

		this.clear = function(){
			worker.postMessage({ command: 'clear' });
		};

		this.getBuffer = function(cb) {
			currCallback = cb || config.callback;
			worker.postMessage({ command: 'getBuffer' })
		};

		this.exportWAV = function(cb, type){
			currCallback = cb || config.callback;
			type = type || config.type || 'audio/wav';
			if (!currCallback) throw new Error('Callback not set');

			worker.postMessage({
				command: 'exportWAV',
				type: type
			});
		};

		this.exportOGG = function(cb){

			currCallback = cb || config.callback;
			console.log("making this call");
			worker.postMessage({
				command: 'exportOGG'
			});
			
		};


		this.exportMP3 = function(cb){
			currCallback = cb || config.callback;
			console.log("making this call");
			worker.postMessage({
				command: 'exportMP3'
			});

		};



		this.node.onaudioprocess = function(e){
			if (!recording) return;


			worker.postMessage({
				command: 'record',
				buffer: [
					e.inputBuffer.getChannelData(0),
				]
			});
		};

		source.connect(this.node);
		this.node.connect(this.context.destination);    //this should not be necessary




	}



  var audioRecorder =  {

	  fromSource: function(src, cfg){
		 return new RecorderObject(src, cfg);
	  },

	  requestDevice: function (callback, cfg) {

		  cfg = cfg || {};
		  callback = callback || function(){};

		  window.AudioContext = window.AudioContext || window.webkitAudioContext;
		  navigator.getUserMedia = ( navigator.getUserMedia ||
		  navigator.webkitGetUserMedia ||
		  navigator.mozGetUserMedia ||
		  navigator.msGetUserMedia);
		  window.URL = window.URL || window.webkitURL;

		  audio_context = new AudioContext;


		  navigator.getUserMedia({audio: true}, function(stream){

			  callback(new RecorderObject(audio_context.createMediaStreamSource(stream), cfg));

		  }, function(e) {

			  console.log("An error occurred"); //Null if something goes wrong
			  callback(null);

		  });

	  }


	};


	window.audioRecorder = audioRecorder;






})(window);
