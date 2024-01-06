// Footer Automatic Year
$(document).ready(function() {
    var date = new Date();
    var year = date.getFullYear();
    
    if (year != 2017) {
        var currentYear = date.getFullYear().toString();
        var totalYear = "2017" + " - " + currentYear.toString();
        document.getElementById("yearSoFar").innerHTML = totalYear;
    } else {
        document.getElementById("yearSoFar").innerHTML = year;
    }
    
    var myAge = year - 1990;
    $('age').html(myAge);
});

// Typing Animation - Title
document.addEventListener('DOMContentLoaded', function(){
    Typed.new('.masthead-brand', {
        strings: ['testing123', 'Bobby', 'Bob Ricardy <i id="peace" class="fa fa-hand-peace-o fa-lg"></i>'],
        backDelay: 500,
        backSpeed: 200,
        startDelay: 1000,
        typeSpeed: 100,
        cursorChar: "",
        contentType: 'html'
    });
});

function changeBorderAboutMe() {
    $("#borderAboutMe").fadeOut(400);
    $("#borderAboutMe").fadeIn(400);
}

function changeBorderContactMe() {
    $("#contact").fadeOut(400);
    $("#contact").fadeIn(400);
}

// Resume Animation
$(function() {
    $('#linkResume').mouseenter(function() {
        $('#linkResume').addClass('animated shake');
    });
    
    $('#linkResume').mouseleave(function() {
        $('#linkResume').removeClass('animated shake');
    });
});

// Smooth Scrolling
$(function() {
    $('a[href*="#"]:not([href="#"])').click(function() {
        if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
            var target = $(this.hash);
            target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
            if (target.length) {
                $('html, body').animate({
                    scrollTop: target.offset().top
                }, 400);
                return false;
            }
        }
    });
});

// Tooltip hovering
$(function(){
    $('[data-toggle="tooltip"]').tooltip();
});

// Konami Code Sequence - Easter Egg :)
var allowedKeys = {
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
    65: 'a',
    66: 'b'
};

var konamiCode = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a'];

var konamiCodePosition = 0;

document.addEventListener('keydown', function(e) {
    // get the value of the key code from the key map
    var key = allowedKeys[e.keyCode];

    // get the value of the required key from the konami code
    var requiredKey = konamiCode[konamiCodePosition];

    // compare the key with the required key
    if (key == requiredKey) {

        // move to the next key in the konami code sequence
        konamiCodePosition++;

        // if the last key is reached, activate cheats
        if (konamiCodePosition == konamiCode.length)
            activateCheats();
    } else
        konamiCodePosition = 0;
});

function activateCheats() {
    inverseColors();
    konamiCodePosition = 0;
}

function inverseColors() { 
    var css = 'html {-webkit-filter: invert(100%);' +
        '-moz-filter: invert(100%);' + 
        '-o-filter: invert(100%);' + 
        '-ms-filter: invert(100%); }',

        head = document.getElementsByTagName('head')[0],
        style = document.createElement('style');

    if (!window.counter) { window.counter = 1;} else  { window.counter ++;
                                                       if (window.counter % 2 == 0) { var css ='html {-webkit-filter: invert(0%); -moz-filter:    invert(0%); -o-filter: invert(0%); -ms-filter: invert(0%); }'}
                                                      };

    style.type = 'text/css';
    if (style.styleSheet){
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }

    head.appendChild(style);
}
