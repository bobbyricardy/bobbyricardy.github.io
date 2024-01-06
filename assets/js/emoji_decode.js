$(function convert() {
    var input = document.getElementById('body').innerHTML;
    var output = emojione.shortnameToImage(input);
    document.getElementById('body').innerHTML = output;
});