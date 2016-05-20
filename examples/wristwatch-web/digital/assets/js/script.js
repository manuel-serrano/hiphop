// Map digits to their names (this will be an array)
var digit_to_name = 'zero one two three four five six seven eight nine'.split(' ');

// This object will hold the digit elements
var digits = {};

// Cache some selectors
var clock;
var alarm;
var ampm;

function digital_cache() {
   clock = $('#clock');
   alarm = clock.find('.alarm'),
   ampm = clock.find('.ampm');
}

function digital_init(){

   // Positions for the hours, minutes, and seconds
   var positions = [
      'h1', 'h2', ':', 'm1', 'm2', ':', 's1', 's2'
   ];

   digital_cache();
   var digit_holder = clock.find('.digits');

   $.each(positions, function(){

      if(this == ':'){
	 digit_holder.append('<div class="dots">');
      }
      else{

	 var pos = $('<div>');

	 for(var i=1; i<8; i++){
	    pos.append('<span class="d' + i + '">');
	 }

	 // Set the digits as key:value pairs in the digits object
	 digits[this] = pos;

	 // Add the digit elements to the page
	 digit_holder.append(pos);
      }

   });
};


function digital_tick(h, m, s, mode){
   // Use moment.js to output the current time as a string
   // hh is for the hours in 12-hour format,
   // mm - minutes, ss-seconds (all with leading zeroes),
   // d is for day of week and A is for AM/PM

   var now = moment();
   var hours_mode = mode == "24H" ? "HH" : "hh";

   now.hour(h);
   now.minute(m);
   now.second(s);

   now = now.format(hours_mode + "mmss");

   digits.h1.attr('class', digit_to_name[now[0]]);
   digits.h2.attr('class', digit_to_name[now[1]]);
   digits.m1.attr('class', digit_to_name[now[2]]);
   digits.m2.attr('class', digit_to_name[now[3]]);
   digits.s1.attr('class', digit_to_name[now[4]]);
   digits.s2.attr('class', digit_to_name[now[5]]);

   ampm.text(mode);
}
