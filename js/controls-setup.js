$('#slider-tempo').slider({
	max: 250,
	min: 50,
	value: 120,
	slide: function(e, ui) {
		$('#tempo-value').text(ui.value);
	},
	change: function(e, ui) {
		tempo = ui.value;
	}
});

$('#slider-volume').slider({
	max: 2,
	min: 0,
	step: 0.1,
	value: 0.4,
	slide: function(e, ui) {
		//$('#tempo-value').text(ui.value);
	},
	change: function(e, ui) {
		MetronomeSoundObject.gain.gain.value = ui.value;
	}
});