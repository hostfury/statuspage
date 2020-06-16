$(document).ready(function() {
	var config = {
		uptimerobot: {
			api_keys: [
				"ur405155-1fd9b8b88180cc9e60378771" //read only account key
			],
			logs: 1,
			response_times: 1,
			response_times_limit: 1,
			average_response_time: 1
		},
		github: {
			org: 'hostfury',
			repo: 'statuspage'
		}
	};
	var status_text = {
		'operational': 'operational',
		'investigating': 'investigating',
		'major outage': 'outage',
		'degraded performance': 'degraded',
	};
	var monitors = config.uptimerobot.api_keys;
	for( var i in monitors ){
		var api_key = monitors[i];
		$.post('https://api.uptimerobot.com/v2/getMonitors', {
			"api_key": api_key,
			"format": "json",
			"logs": config.uptimerobot.logs,
			"response_times": config.uptimerobot.response_times,
			"response_times_limit": config.uptimerobot.response_times_limit,
			"average_response_time": config.uptimerobot.average_response_time
		}, function(response) {
			status( response );
		}, 'json');
	}
	function status(data) {
		data.monitors = data.monitors.map(function(check) {
			check.class = check.status === 2 ? 'label-success' : 'label-danger';
			check.text = check.status === 2 ? 'operational' : 'outage';
			if( check.status !== 2 && !check.lasterrortime ){
				check.lasterrortime = Date.now();
			}
			if (check.status === 2 && Date.now() - (check.lasterrortime * 1000) <= 86400000) {
				check.class = 'label-warning';
				check.text = 'degraded performance';
			}
			return check;
		});

		var status = data.monitors.reduce(function(status, check) {
			return check.status !== 2 ? 'danger' : 'operational';
		}, 'operational');
		
		if (!$('#panel').data('incident')) {
			$('#panel').attr('class', (status === 'operational' ? 'panel-success' : 'panel-warning') );
			$('#paneltitle').html(status === 'operational' ? 'All systems are operational.' : 'One or more systems inoperative');
		}
		data.monitors.forEach(function(item) {
			var name = item.friendly_name;
			var clas = item.class;
			var text = item.text;
			var avgrsp = item.average_response_time;
			$('#services').append('<div class="list-group-item">'+ '<span class="pull-right label '+ clas + '">' + text + '</span><span class="pull-right" style="margin-right:5px;">'+Math.round(avgrsp)+'ms</span> ' +
				'<h4 class="list-group-item-heading">' + name + '</h4>' +
				'</div>');
		});
	};

	$.getJSON( 'https://api.github.com/repos/' + config.github.org + '/' + config.github.repo + '/issues?state=all' ).done(message);

	function message(issues) {
		issues.forEach(function(issue) {
			var status = issue.labels.reduce(function(status, label) {
				if (/^status:/.test(label.name)) {
					return label.name.replace('status:', '');
				} else {
					return status;
				}
			}, 'operational');

			var systems = issue.labels.filter(function(label) {
				return /^system:/.test(label.name);
			}).map(function(label) {
				return label.name.replace('system:', '')
			});
			if (issue.state === 'open') {
				$('#panel').data('incident', 'true');
				$('#panel').attr('class', (status === 'operational' ? 'panel-success' : 'panel-warning') );
				$('#paneltitle').html('<a href="#incidents">' + issue.title + '</a>');
			}

			var html = '<article class="timeline-entry">\n';
			html += '<div class="timeline-entry-inner">\n';
			if (issue.title.includes("Planned Maintenance") || systems.includes("Planned Maintenance")) {
			    html += '<div class="timeline-icon bg-info"><i class="entypo-feather"></i></div>';
			} else if (issue.state === 'closed') {
				html += '<div class="timeline-icon bg-success"><i class="entypo-feather"></i></div>';
			} else if (issue.title.includes("Investigating:") {
				html += '<div class="timeline-icon bg-warning"><i class="entypo-feather"></i></div>';
			} else {
				html += '<div class="timeline-icon bg-secondary"><i class="entypo-feather"></i></div>';
			}

			html += '<div class="timeline-label">\n';
			if (issue.state === 'closed') {
				html += '<span style="margin-left:5px;" class="badge label-success pull-right">closed</span>';
			} else {
				html += '<span style="margin-left:5px;" class="badge ' + (status === 'operational' ? 'label-success' : 'label-warning') + ' pull-right">open</span>\n';
			}
			html += '<h2><b>' + issue.title + '</b></h2>\n';
			html += '<span class="date">Created: ' + datetime(issue.created_at) + ' (' + jQuery.timeago(issue.created_at) + ')</span>\n';
			if (issue.created_at === issue.updated_at){
			    //
			} else {
			    html += '<br /><span class="date">Updated: ' + datetime(issue.updated_at) + ' (' + jQuery.timeago(issue.updated_at) + ')</span>\n';
			}
			html += '<hr>\n';
			var issuebody  = issue.body.replace(/\n/g, "<br />");
			html += '<p>' + issuebody + '</p>\n';
			if (systems.length > 0){
    			html += '<p>Impacted: ';
			}
			for (var i = 0; i < systems.length; i++) {
				html += '<span style="margin-right:5px;" class="badge system">' + systems[i] + '</span>';
			}
			if (systems.length > 0){
    			html += '</p>';
			}
			html += '</div>';
			html += '</div>';
			html += '</article>';
			$('#incidents').append(html);
		});
		function exists(arr, search) {
            return arr.some(row => row.includes(search));
        }
		function datetime(string) {
		    var d = new Date(string);
		    var local = d.toLocaleString('en-US','timeZone');
			//var datetime = string.split('T');
			//var date = datetime[0];
			//var time = datetime[1].replace('Z', ' UTC');
			//var local = date + ' ' + time.toString();
			return local;
		};
	};
});
