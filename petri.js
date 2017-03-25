var petri = (function() {
	var module = {};

	var canvasWidth;
	var canvasHeight;

	var dotDensity = 2.5;
	var dotColor = "rgba(255,255,255,.5)";
	var nDots;
	var maxSpeed = 16;
	var maxRadius = 2;
	var minRadius = 1;
	var At = 0.016; //60fps
	var maxDistanceUnion = 100;

	var timeout = null;
	var where_id = "petri";

	module.start = function (where, width, height, changeBG) {

		where_id = where;
		var canvas = document.getElementById(where);
		if(canvas === null) {
			console.error("Canvas not found. Add onload event listener!");
		}
		else {
			module.stop();
			canvasWidth = width || window.innerWidth;
			canvasHeight = height || window.innerHeight;
			nDots = Math.floor(canvasHeight*canvasWidth/10000*dotDensity);
			if(changeBG || changeBG === undefined) {
				setBackground(canvas);
			}
			resizeCanvas(canvas);
			var sup = canvas.getContext("2d");

			canvas.dots = createDots(nDots);
			var tree = new Quadtree({
				x: 0,
				y: 0,
				width: canvas.width,
				height: canvas.height,
			},10,3);

			var anim = function(curr_time) {
				sup.clearRect(0,0,canvas.width,canvas.height);

				At = (curr_time - anim.last_callback) / 1000;
				anim.last_callback = curr_time;

				for(var i = 1; i<nDots; i++) {
					canvas.dots[i].evol(At);
					canvas.dots[i].draw(sup);
				}
				tree.update(canvas.dots);

				for(var i = 0; i<nDots; i++) {
					canvas.dots[i].unir(sup,tree);
				}
				timeout = window.requestAnimationFrame(anim);
			};
			anim.last_callback = 0;
			timeout = window.requestAnimationFrame(anim);

			canvas.addEventListener("mousemove", old_mouse = function(e) {
				canvas.dots[0].x = e.clientX;
				canvas.dots[0].y = e.clientY;
			});

		}
	}

	module.stop = function() {
		if(timeout !== null) {
			cancelAnimationFrame(timeout);
			timeout = null;
		}
	}
	module.clear = function() {
		module.stop();
		var canvas = document.getElementById(where_id).getContext("2d");
		canvas.clearRect(0,0,canvasWidth,canvasHeight);
	}

	module.play = function(){
		if(timeout === null) {
			module.start(where_id,canvasWidth,canvasHeight,false);
		}
	}

	/**
	* Returns a random number between A and B.
	* @param {number} A - Minimum value.
	* @param {number} B - Maximum value.
	*/
	function random(A, B) {
       	return Math.floor(Math.random()*(B-A+1)+A);
	}

	function resizeCanvas(canvas) {
		canvas.height = canvasHeight;
		canvas.width = canvasWidth;
	}

	function createDots (n) {
		var arr = [];
		for(var i = 0; i<n; i++) {
			arr[i] = new Dot();
		}
		return arr;
	}

	function setBackground(elem) {
		var colors = ["336699","20C29A","8C20C2","0E193D"];
		//var colors = ["0E193D", "011123"]
		if(colors.length > 1) {
			var n = random(0,colors.length-1);
			var m = (n + random(1,colors.length-2)) % colors.length;
			setBackgroundGradient(elem, colors[n], colors[m], random(60,120));
		}
		colors = null;
	}


	/**
	* Establece un degradado como color de fondo de un elemento DOM
	* @param elemento objeto al que se aplica el color de fondo
	* @param hex1 Color 1 en hexadecimal (sin #)
	* @param hex2 Color 2 en hexadecimal (sin #)
	* @param degrees Inclinación del degradado
	*/
	function setBackgroundGradient(elem, hex1, hex2, degrees) {
		elem.style.backgroundImage = "linear-gradient(" + degrees + "deg, #" + hex1 + ", #" + hex2 + ")";
	}

	function Dot() {
		/*Position*/
		this.x = random(0,canvasWidth);
		this.y = random(0,canvasHeight);
		this.radius = random(minRadius, maxRadius);
		this.randomSpeed();

		//For quadtree support. Not used
		this.width = 0;
		this.height = 0;
	}

	Dot.prototype.randomSpeed = function() {
		//var speed = puntos.maxSpeed* (1 - (this.radius-puntos.minRadius)/puntos.maxRadius);
		var speed = maxSpeed * (this.radius - minRadius/2) / (maxRadius - minRadius/2);
		var dir = Math.random()*Math.PI*2;
		this.vx = speed*Math.cos(dir);
		this.vy = speed*Math.sin(dir);
	}

	Dot.prototype.draw = function(canvas) {
		canvas.beginPath();
		canvas.fillStyle = dotColor;
		canvas.arc(this.x,this.y,this.radius,0,2*Math.PI);
		canvas.fill();
	}

	Dot.prototype.evol = function(t) {
		this.x = (this.x + this.vx*t).mod(canvasWidth);
		this.y = (this.y + this.vy*t).mod(canvasHeight);
	}

	Dot.prototype.unir = function(canvas,quadtree) {
		var elems = quadtree.retrieve({
			x: this.x - maxDistanceUnion,
			y: this.y - maxDistanceUnion,
			width: maxDistanceUnion*2,
			height: maxDistanceUnion*2
		});

		var distance;

		for(var i = 0; i<elems.length; i++) {
			distance = this.distance(elems[i]);
			if(distance < maxDistanceUnion) {
				canvas.strokeStyle = "rgba(255,255,255," + ((1-distance/maxDistanceUnion)/4) + ")";
				canvas.beginPath();
				canvas.moveTo(this.x,this.y);
				canvas.lineTo(elems[i].x,elems[i].y);
				canvas.stroke();
			}
		}

	}

	Dot.prototype.distance = function(dot)  {
		var dx = Math.abs(this.x - dot.x),
			dy = Math.abs(this.y - dot.y);
		return Math.sqrt(dx*dx + dy*dy);
	}

	Number.prototype.mod = function(n) {
	    return ((this % n) + n) % n;
	};

	Quadtree.prototype.update = function(objs) {
		this.clear();
		for(var i=0; i<objs.length; i++) {
			this.insert(objs[i]);
		}
	}



	function Grid(width, height) {
		this._init.apply(this, arguments);
	}

	Grid.prototype = {
		_init: function(width, height) {
			if(width <= 0 || height <= 0)
				throw "Size units must be positive: (" + width + "," + height + ")";

			this.width = width;
			this.height = height;

			this.columns = this.rows = 8;

			this.grid = [];
			for(var j = 0; j < this.columns; ++j) {
				this.grid.push([]);
			}
		},

		insert: function(point) {
			var col = point.x / this.width * this.columns,
			    row = point.y / this.height * this.rows;

			var section = this.grid[row][col];
			if(section.indexOf(point) < 0) {
				section.push(point);
			}
		},

		visible_points: function(point, radius) {
			var visible = [];
			var init_col = Math.max((point.x - radius) / this.width * this.columns, 0),
			     end_col = Math.min((point.x + radius) / this.width * this.columns, this.columns - 1);
			var init_row = Math.max((point.y - radius) / this.height * this.rows, 0),
			     end_row = Math.min((point.y + radius) / this.height * this.rows, this.rows - 1);

			for(var i = init_row; i < end_row; ++i) {
				for(var j = init_col; i < end_col; ++j) {
					this.grid[i][j].forEach(function(other) {
						if(point.distance(other) <= radius) {
							visible.push(other);
						}
					});
				}
			}
			return visible;
		}
	}

	return module;
})();
