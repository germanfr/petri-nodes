const Petri = require('petri-nodes');

var canvas = document.getElementById('petri');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var my_petri = new Petri.Petri(canvas, {
	dot_density: 0.4,
	with_cursor: true
});
document.getElementById('stop').onclick = my_petri.stop.bind(my_petri);
document.getElementById('play').onclick = my_petri.start.bind(my_petri);

var resize_timeout;
window.addEventListener('resize', function () {
	if(resize_timeout)
		clearTimeout(resize_timeout);

	resize_timeout = setTimeout(function() {
		my_petri.resize(window.innerWidth, window.innerHeight);
	}, 1);
});
