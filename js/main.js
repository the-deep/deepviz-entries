console.log('main.js');


var sources = ['data/data1.json', 'data/iomdata.csv'];

var Deepviz = new Deepviz(sources, function(data){

	console.log(data);

	// create svg
	var timelineSvg = Deepviz.createSvg({
		id: 'timeline_viz',
		viewBoxWidth: 1300,
		viewBoxHeight: 1000
	});


	// organise data
	var timedata = data[1];

	var date_data = d3.nest()
	.key(function(d) { return d.date;})
	.rollup(function(d) { 
		return d3.sum(d, function(g) {return g.individuals; });
	}).entries(timedata);

	date_data.forEach(function(d){
		d.key = new Date(d.key);
	});

	console.log(date_data);


	var timeChart = Deepviz.timeChart({
		appendTo: timelineSvg,
		id: 'timeChart',
		opacity: 1,
		gutter: 0.5,
		height: 500,
		svgheight: 1000,
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
				family: 'Calibri',
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
					size: '16px',
					weight: 'bold',
					family: 'Calibri',
					padding: 0
				},
				label: {
					size: '14px',
					weight: 'bold',
					family: 'Calibri',
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
					family: 'Calibri'
				},
				label: {
					size: '14px',
					weight: 'bold',
					family: 'Calibri'
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
		data: date_data,
		dataValues: 'values',
		dataKey: 'key',
		// sliderUpdate: function(a,b){
		// 	sliderUpdate(a,b);
		// },
		frame: [1]
	});



});