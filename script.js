function urldecode(str) {
  return unescape(str.replace(/\+/g, ' '));
}
function clearCanvas(context, canvas) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  var w = canvas.width;
  canvas.width = 1;
  canvas.width = w;
}
function getUsers(room) {
  var i;
  $.getJSON('/users', {
    room: room
  }, function(data) {
    $('#users').html(room + ': ');
    for ( i in data ) {
      $('#users').append('<span style="color: ' + data[i].color + ';">' + data[i].name + '</span> ');
    }
  });
}
function update(room, context) {
  $.get('/update', {
    room: room
  }, function(data) {
    var imageObj = new Image();
    imageObj.onload = function() {
      context.drawImage(this, 0, 0);
    };
    imageObj.src = urldecode(data);
    console.log(imageObj.src);
  });
}

function go(name, room, color) {
  $('input[name="share-url"]').val(window.location.href + 'room/' + room);
  setInterval(function() {
    getUsers(room)
  }, 1337);
  // periodically send new lines segments to the server
  setInterval(function() {
    send_line_segments();
  }, 1000);
  var canvas = $('#canvas');
  var context = canvas.get(0).getContext('2d');
  var mouse_down = false;
  var last_x, last_y; // start of the current line segment
  var line_buffer = [] // lines waiting to be sent to server
  $('#clear-all').click(function(ev) {
    ev.preventDefault();
    clearCanvas(context, canvas.get(0));
  });
  var on_mousemove = function(ev) {
    var x = ev.pageX - canvas.offset().left;
    var y = ev.pageY - canvas.offset().top;
    if ( mouse_down ) {
      context.lineTo(x, y);
      context.strokeStyle = color;
      context.stroke();
      buffer_line_segment(last_x, last_y, x, y);
      last_x = x;
      last_y = y;
    }
  }
  var on_mouseup = function(ev) {
    mouse_down = false;
  }
  var on_mousedown = function(ev) {
    mouse_down = true;
    context.beginPath();
  }
  canvas.bind({
    'mousemove': on_mousemove,
    'mousedown': on_mousedown,
    'mouseup': on_mouseup
  });

  function buffer_line_segment (x1, y1, x2, y2) {
    // add a line segment to the buffer to be sent to server
    line_buffer = line_buffer.concat(x1, y1, x2, y2);
  }

  function send_line_segments () {
    // send new line segments to the server and empty the buffer
    // do nothing if there are no lines to send
    if (line_buffer.length === 0) {
      return;
    }
    var data = {};
    data.room = room;
    data.lines = line_buffer;
    $.get('/draw', {data: JSON.stringify(data)}, function() {
      // success, clear the line buffer
      // TODO: if lines are drawn during the request, they will be lost here
      line_buffer = [];
    });
  }

}

$(function() {
  var room, color;
  $.get('/get-a-room', function(data) {
    room = data;
    smoke.prompt('We gave you a room: ' + room + '. What\'s your name?', function(name) {
      if (name) {
        $.get('/join', {
            name: name,
            room: room
          }, function(data) {
            color = data;
            go(name, room, color);
          }
        );
      } else {
        location.reload();
      }
    });
  });
});
