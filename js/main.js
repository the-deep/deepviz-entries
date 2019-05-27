console.log('main.js');
var colorGreen = ['#A1E6DB', '#76D1C3', '#36BBA6', '#1AA791', '#008974'];
var colorGrey = ['#CDCDCD', '#AFAFAF', '#939393', '#808080', '#646464'];
var colorLightgrey = ['#CDCDCD', '#AFAFAF', '#939393', '#808080', '#646464'];

var severityArray = ["No problem/Minor Problem", "Of Concern", "Major", "Severe", "Critical"];
var reliabilityArray = ["Unreliable", "Not Usually Reliable", "Fairly Reliable", "Usually Reliable", "Completely Reliable"];

var sources = [ 'data/data3.json'];

var Deepviz = new Deepviz(sources, function(data){

	console.log(Deepviz.filters);



	//**************************
	// severity chart
	//**************************
	var severityChart = Deepviz.createSeverityChart();


	//**************************
	// reliability chart
	//**************************
	var reliabilityChart = Deepviz.createReliabilityChart();


	//**************************
	// time chart
	//**************************

	// create svg
	var timelineSvg = Deepviz.createSvg({
		id: 'timeline_viz',
		viewBoxWidth: 1300,
		viewBoxHeight: 1000,
		div: '#timeline'
	});

	var timeChart = Deepviz.timeChart({
		appendTo: timelineSvg,
		id: 'timeChart',
		opacity: 1,
		gutter: 0.5,
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
		dataValues: 'total_entries',
		dataKey: 'key',
		// sliderUpdate: function(a,b){
		// 	sliderUpdate(a,b);
		// },
		frame: [1]
	});





});