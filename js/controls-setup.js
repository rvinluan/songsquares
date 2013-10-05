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

$('#show-settings').click(function(){
	$('#settings').slideToggle();
});
$('#show-tutorial').click(function(){
	$('#tutorial').slideToggle();
});

$('#settings input').on('change', function(e){
	$('.vm-dot').removeClass("active");
	$('#visual-metronome-container').toggle(); 
	MetronomeSoundObject.audioOn = (e.target.value === "audio");
})

$('#save').click(function(){
    var asc = $("#after-save-container");
    var cv = $('#canvas');
    asc.css({
        top: (cv.height()/2) - (asc.height()/2),
        left: (cv.width()/2) - (asc.width()/2)
    });
    asc.find('.button').hide();
    asc.find('h1').hide();
    asc.show();
    $.ajax({
        type: "POST",
        url: "http://do.robertvinluan.com:1337/datadump",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify(decircularizeAll()),
        success: function(data) {
            console.log("success!");
            console.log("id returned: " + data);
            asc.find('h1').text("Song Saved!");
            asc.find('p').html("<p>Here's your unique url:</p><p><p>http://robertvinluan.com/songsquares/looper.html?s="+data+"</p>");
            asc.find('.button').show().text("OK").click(function(){
                asc.hide();
            });
        },
        error: function(){
            asc.find('p').text("There was an error saving the song. Please try again.")
            console.log("error");
        }
    });
})
