var weatherUtil = require("./weatherUtil");

function pad(n) {
    return (n < 10) ? ("0" + n) : n;
}

function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

// Doesn't work if definition comes after use.  Why?
String.prototype.howie = function howie () {
    return this.replace("smith", "howie"); 
};

var d = new Date();
var date = d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
var weatherKey = "43e6421946604070";

var date2 = new Date("June 10, 2016");

console.log("date = %s\ndate2 = %s-%s-%s", date, date2.getFullYear(),  pad(date2.getMonth()), pad(date2.getDate()));

var self = this;
var name = "john smith";
var name2 = "jim-bob";
console.log("%s    %s", name.toProperCase(), name2.toProperCase());
console.log("%s    %s", toTitleCase(name), toTitleCase(name2));console.log("%s", name.howie());

//Using String.prototype adds these function to the String class
//Placed here, jim-bob becomes Jim-Bob
// Placed before usage, jim-bob becomes Jim-bob
String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};




