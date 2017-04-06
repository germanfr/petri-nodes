(function() {

	module.exports = {};

	/**
	* Returns a random number between A and B, both included.
	* @param {number} min - Minimum value.
	* @param {number} max - Maximum value.
	*/
	function random(min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	}

	/**
	* Round module including negative numbers.
	* Example: -1 % 4 === 3
	* @param {number} div - Dividend
	* @param {number} dsor - Divisor
	*/
	function round_mod(div, dsor) {
		return (div % dsor + dsor) % dsor;
	}


	const DOT_MIN_RADIUS = 1;
	const DOT_MAX_RADIUS = 2;
	const DOT_MIN_SPEED = 4;
	const DOT_MAX_SPEED = 12;

	const MAX_DISTANCE_UNION = 100;

	const DRAW_DOT_COLOR = 'rgba(255,255,255,0.75)';
	const TWO_PI = 2 * Math.PI;
	const MIN_REFRESH_INTERVAL = 0.02; // (seconds) ~60FPS (little bit less)

	function Dot(canvas, x, y, radius) {
		this._init(canvas, x, y, radius);
	}

	Dot.prototype = {
		_init: function(canvas, x, y, radius) {
			this.canvas = canvas;
			this.context = canvas.getContext('2d');

			this.x = x;
			this.y = y;
			this.radius = radius;
			this.vx = 0;
			this.vy = 0;

			this.adjacents = [];
			this.painted = false;
		},

		distance: function(other) {
			var dx = this.x - other.x,
			    dy = this.y - other.y;
			return Math.sqrt(dx * dx + dy * dy);
		},

		step: function(dt) {
			this.x = round_mod(this.x + this.vx * dt, this.canvas.width);
			this.y = round_mod(this.y + this.vy * dt, this.canvas.height);
			this.painted = false;
		},

		draw: function() {
			let canvas = this.context;
			canvas.beginPath();
			canvas.fillStyle = DRAW_DOT_COLOR;
			canvas.arc(this.x, this.y, this.radius, 0, TWO_PI);
			canvas.fill();

			this._draw_unions();
			this.painted = true;
		},

		_draw_unions: function() {
			var neighbor;
			for(let i = 0; i < this.adjacents.length; ++i) {
				neighbor = this.adjacents[i];
				if(!neighbor.painted) {
					this._draw_union_with(neighbor);
				}
			}
		},

		_draw_union_with: function(other) {
			let canvas = this.context;
			let opacity = (1 - this.distance(other) / MAX_DISTANCE_UNION);
			opacity *= opacity * 0.9; // Max opacity is 0.9, min is 0

			canvas.beginPath();
			canvas.strokeStyle = 'rgba(255,255,255,' + opacity + ')';
			canvas.lineWidth = 1;
			canvas.moveTo(this.x, this.y);
			canvas.lineTo(other.x, other.y);
			canvas.stroke();
		}
	}

	function RandomDot(canvas) {
		this._init(canvas);
	}

	RandomDot.prototype = {
		__proto__: Dot.prototype,

		_init: function(canvas) {
			let pos_x = Math.random() * canvas.width;
			let pos_y = Math.random() * canvas.height;
			let radius = random(DOT_MIN_RADIUS, DOT_MAX_RADIUS);
			Dot.prototype._init.call(this, canvas, pos_x, pos_y, radius);

			this._init_movement();
		},

		_init_movement: function() {
			// The smaller the slower (because it's supposed to be farther)
			var speed = DOT_MIN_SPEED + (DOT_MAX_SPEED - DOT_MIN_SPEED) *
			            (this.radius - DOT_MIN_RADIUS) / (DOT_MAX_RADIUS - DOT_MIN_RADIUS);
			var direction = Math.random() * TWO_PI;
			this.vx = speed * Math.cos(direction);
			this.vy = speed * Math.sin(direction);
		},
	}

	function CursorDot(canvas) {
		this._init(canvas);
	}

	CursorDot.prototype = {
		__proto__: Dot.prototype,

		_init: function(canvas) {
			Dot.prototype._init.call(this, canvas, 0, 0, 0);

			canvas.addEventListener('mousemove', this);
		},

		handleEvent: function(event) {
			this.x = event.clientX;
			this.y = event.clientY;
		},

		draw: function () {
			for(let i = 0; i < this.adjacents.length; ++i) {
				this._draw_union_with(this.adjacents[i]);
			}
		},

		step: function() {}
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

			this.rows = 4 * Math.floor(height / MAX_DISTANCE_UNION);
			this.columns = 4 * Math.floor(width / MAX_DISTANCE_UNION);

			this.grid = new Array(this.rows);
			for(let i = 0; i < this.rows; ++i) {
				this.grid[i] = new Array(this.columns);
				for(let j = 0; j < this.columns; ++j) {
					this.grid[i][j] = [];
				}
			}
		},

		insert: function(point) {
			var section = this.get_section(point.x, point.y);
			if(section.indexOf(point) < 0) {
				section.push(point);
			}
		},

		update_point: function(old_x, old_y, point) {
			let old_section = this.get_section(old_x, old_y);
			let pos = old_section.indexOf(point);

			if(pos < 0)
				return;

			old_section.splice(pos, 1);

			let new_section = this.get_section(point.x, point.y);
			new_section.push(point);
		},

		get_section: function(x, y) {
			return this.grid[this.get_row(y)][this.get_column(x)];
		},

		get_column: function(x) {
			return Math.floor(x * this.columns / this.width);
		},

		get_row: function(y) {
			return Math.floor(y * this.rows / this.height);
		},

		visible_points: function(point, radius) {
			var visible = [];
			var init_col = Math.max(this.get_column(point.x - radius), 0),
			     end_col = Math.min(this.get_column(point.x + radius) + 1, this.columns);
			var init_row = Math.max(this.get_row(point.y - radius), 0),
			     end_row = Math.min(this.get_row(point.y + radius) + 1, this.rows);


			for(let i = init_row; i < end_row; ++i) {
				for(let j = init_col; j < end_col; ++j) {
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

	function Petri(canvas, params) {
		this._init(canvas, params);
	}

	Petri.prototype = {
		_init: function(canvas, params) {
			this.canvas = canvas;
			this.context = canvas.getContext('2d');
			this.width = canvas.width;
			this.height = canvas.height;

			this.run = false;
			this._on_stop_callbacks = [];

			if(params.dot_density) {
				this.n_points = this.width * this.height * params.dot_density / 1000;
			} else if(params.n_points) {
				this.n_points = params.n_points;
			} else {
				this.n_points = this.width * this.height * 0.25 / 1000;
			}
			this.n_points = Math.floor(this.n_points);

			this.points = new Array(this.n_points);
			this.surface = new Grid(this.width, this.height);

			for(let i = 0; i < this.n_points; ++i) {
				this.points[i] = new RandomDot(this.canvas);
				this.surface.insert(this.points[i]);
			}

			if(params.with_cursor)
				this.points[0] = new CursorDot(this.canvas);
		},

		_update_graph: function () {
			var point;
			for(let i = 0; i < this.points.length; ++i) {
				point = this.points[i];
				point.adjacents = this.surface.visible_points(point, MAX_DISTANCE_UNION);
			}
		},

		start: function() {
			if(this.run) return;

			this.run = true;
			this.time = performance.now();
			window.requestAnimationFrame(this._step_frame.bind(this));
		},

		stop: function (callback) {
			if(this.run) {
				if(typeof callback === 'function')
					this._on_stop_callbacks.push(callback);
				this.run = false;
			} else {
				if(typeof callback === 'function')
					callback();
			}
		},

		_stopped: function() {
			let callback;
			while(this._on_stop_callbacks.length !== 0) {
				callback = this._on_stop_callbacks.pop();
				callback();
			}
		},

		_step_frame: function(current_time) {
			let time_diff = (current_time - this.time) / 1000;

			if(time_diff >= MIN_REFRESH_INTERVAL) {
				this.step(time_diff);
				this.draw();

				this.time = current_time;
			}

			if(this.run) {
				window.requestAnimationFrame(this._step_frame.bind(this));
			} else {
				this._stopped();
			}
		},

		step: function(dt) {
			var point;
			var old_x, old_y;
			for(let i = 0; i < this.points.length; ++i) {
				point = this.points[i];
				old_x = point.x; old_y = point.y;
				point.step(dt);
				this.surface.update_point(old_x, old_y, point);
			}
			this._update_graph();
		},

		draw: function() {
			var point;

			this.context.clearRect(0 , 0, this.width, this.height);
			for(let i = 0; i < this.points.length; ++i) {
				point = this.points[i];
				point.draw();
			}
		},

		resize: function(width, height) {
			let was_running = this.run;

			let width_proportion = width / this.width;
			let height_proportion = height / this.height;

			this.stop(() => {
				this.surface.width = this.width = this.canvas.width = width;
				this.surface.height = this.height = this.canvas.height = height;
				this.points.forEach(function(point) {
					point.x = point.x * width_proportion;
					point.y = point.y * height_proportion;
				});

				if(was_running)
					this.start();
			});
		}

	}

	module.exports.Petri = Petri;
})();
