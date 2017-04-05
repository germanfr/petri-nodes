module.exports = function (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		browserify: {
			dist: {
				cwd: 'src/',
				src: ['*.js'],
				dest: 'dist/',
				expand: true
			},
			options: {
				watch: true,
				keepAlive: true
			}
		}
	});

	// Load Grunt plugins
	grunt.loadNpmTasks('grunt-browserify');

	// Register Grunt tasks
	grunt.registerTask('default', ['browserify']);
};
