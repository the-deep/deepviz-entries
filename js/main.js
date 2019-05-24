console.log('main.js');
var colorGreen = ['#A1E6DB', '#76D1C3', '#36BBA6', '#1AA791', '#008974'];
var colorGrey = ['#CDCDCD', '#AFAFAF', '#939393', '#808080', '#646464'];
var severityArray = ["No problem/Minor Problem", "Of Concern", "Major", "Severe", "Critical"];
var reliabilityArray = ["Unreliable", "Not Usually Reliable", "Fairly Reliable", "Usually Reliable", "Completely Reliable"];

var sources = ['data/data2.json', 'data/iomdata.csv'];

var Deepviz = new Deepviz(sources, function(data){

	// create svg
	var timelineSvg = Deepviz.createSvg({
		id: 'timeline_viz',
		viewBoxWidth: 1300,
		viewBoxHeight: 1000,
		div: '#timeline'
	});

	//**************************
	// severity chart
	//**************************

	// create severity svg
	var severitySvg = Deepviz.createSvg({
		id: 'severitySvg',
		viewBoxWidth: 1000,
		viewBoxHeight: 50,
		div: '#severity_bars',
		width: '100%'
	});


	var severityBars = severitySvg.selectAll('.severityBar')
	.data(severityArray)
	.enter()
	.append('rect')
	.attr('class', 'severityBar')
	.attr('x', function(d,i){
		return (1000/5)*i;
	})
	.attr('width', function(d,i){
		return (1000/5);
	})
	.attr('height', function(d,i){
		return (42);
	})
	.attr('fill', function(d,i){
		return colorGreen[i];
	});

	severitySvg.append('rect')
	.attr('id', 'severityAvg')
	.attr('x', 0)
	.attr('y', -2)
	.attr('height', 45)
	.attr('width', 5)
	.style('fill', '#000');

		//**************************
		// reliability chart
		//**************************

			// create severity svg
	var reliabilitySvg = Deepviz.createSvg({
		id: 'reliabilitySvg',
		viewBoxWidth: 1000,
		viewBoxHeight: 50,
		div: '#reliability_bars',
		width: '100%'
	});

	var reliabilityBars = reliabilitySvg.selectAll('.reliabilityBar')
	.data(reliabilityArray)
	.enter()
	.append('rect')
	.attr('class', 'reliabilityBar')
	.attr('x', function(d,i){
		return (1000/5)*i;
	})
	.attr('width', function(d,i){
		return (1000/5);
	})
	.attr('height', function(d,i){
		return (42);
	})
	.attr('fill', function(d,i){
		return colorGreen[i];
	});

	reliabilitySvg.append('rect')
	.attr('id', 'reliabiltiyAvg')
	.attr('x', 0)
	.attr('y', -2)
	.attr('height', 45)
	.attr('width', 5)
	.style('fill', '#000');
	


	// organise data
	var timedata = data[1];
	var deepdata = data[0].deep.data;

	var date_data = d3.nest()
	.key(function(d) { return d.date;})
	.rollup(function(d) { 
		return d3.sum(d, function(g) {return g.individuals; });
	}).entries(timedata);

	date_data.forEach(function(d){
		d.key = new Date(d.key);
	});

	var timeChart = Deepviz.timeChart({
		appendTo: timelineSvg,
		id: 'timeChart',
		opacity: 1,
		gutter: 0.5,
		height: 400,
		svgheight: 820,
		width: 1300,
		color: ['#0033A0'],
		maxValue: 'round', // integerValue (force define the maximum), 'auto' (find the maximum value in the data), 'round' (pretty rounding based on maximum value in the data)
		paddingLeft: 0,
		paddingTop: 0,
		offsetX: 1,
		offsetY: 0,
		dataLabels: {
			enabled: false,
			font: {
				size: '12px',
				weight: 'normal',
				padding: 6
			}
		},
		yAxis: {
			enabled: true,
			label: '',
			gridlines: {
				enabled: true,
				stroke: '#A7A7A7',
				strokeWidth: 1,
				opacity: 1,
				dotted: true
			},
			font: {
				values: {
					size: '15px',
					weight: 'bold',
					padding: 0
				},
				label: {
					size: '14px',
					weight: 'bold',
					padding: 10
				}
			}
		},
		xAxis: {
			enabled: true,
			label: 'Date',
			gridlines: {
				enabled: true,
				stroke: 'grey',
				strokeWidth: 1,
				opacity: 1
			},
			font: {
				values: {
					size: '14px',
					weight: 'bold',
				},
				label: {
					size: '14px',
					weight: 'bold',
				}
			}
		},
		font: {
			title: {
				size: '20px',
				weight: 'bold'
			},
			subtitle: {
				size: '12px',
				weight: 'normal'
			},
		},
		legend: {
			enabled: false,
			position: 'top'
		},
		dateBrush: true,
		data: deepdata,
		dataValues: 'total_entries',
		dataKey: 'date',
		// sliderUpdate: function(a,b){
		// 	sliderUpdate(a,b);
		// },
		frame: [1]
	});





});