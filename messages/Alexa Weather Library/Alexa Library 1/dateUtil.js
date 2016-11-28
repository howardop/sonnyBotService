/**
 Copyright 2016 IBM. All Rights Reserved.
 Developer: David Thomason
 */

/**
 * Provides date and time utilities to format responses in
 * a manner appropriate for speech output.
 */
var dateUtil = (function () {

    var DAYS_OF_MONTH = [
        '1st',
        '2nd',
        '3rd',
        '4th',
        '5th',
        '6th',
        '7th',
        '8th',
        '9th',
        '10th',
        '11th',
        '12th',
        '13th',
        '14th',
        '15th',
        '16th',
        '17th',
        '18th',
        '19th',
        '20th',
        '21st',
        '22nd',
        '23rd',
        '24th',
        '25th',
        '26th',
        '27th',
        '28th',
        '29th',
        '30th',
        '31st'
    ];

    var DAYS_OF_WEEK = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];

    var MONTHS = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ];
    
    var ONE_DAY = 24*60*60*1000; // hours*minutes*seconds*milliseconds
    
    return {
        
        getDateObject: function(date) {
            
            if (date == 'current'){
                return {
                    displayDate: " is currently ",
                    dataFeature: "conditions"
                }
            } else {
                
                var today = new Date();
                var target = new Date(date);
                
                var today_days_since_epoch = Math.floor(today.getTime() / ONE_DAY);
                var target_days_since_epoch = target.getTime() / ONE_DAY;
                var diff = target_days_since_epoch - today_days_since_epoch;
                
                var dataFeature;
                if(diff > 9) return { error: "I'm sorry, I cannot see more than 10 days into the future." };
                else if (diff > 3) dataFeature = 'forecast10day';
                else if (diff >= 0) dataFeature = 'forecast';
                
                var displayDate;
                if (diff == 0) displayDate = "today";
                else displayDate = " on " + dateUtil.getFormattedDate(target);
                
                return {
                    day: target.getDate(),
                    month: target.getMonth()+1,
                    year: target.getFullYear(),
                    weekday: dateUtil.getWeekdayWithNight(target),
                    period: 2*diff,
                    dataFeature: dataFeature,
                    displayDate: displayDate + " is forecast to be "
                }
            }
        },
        
        getWeekdayWithNight: function (date) {
            return DAYS_OF_WEEK[date.getDay()];
        },
        
        /**
         * Returns a speech formatted date, without the time. If the year
         * is the same as current year, it is omitted.
         * Example: 'Friday June 12th', '6/5/2016'
         */
        getFormattedDate: function (date) {
            var today = new Date();
        
            if (today.getFullYear() === date.getFullYear()) {
                return DAYS_OF_WEEK[date.getDay()] + ' ' + MONTHS[date.getMonth()] + ' ' + DAYS_OF_MONTH[date.getDate() - 1];
            } else {
                return DAYS_OF_WEEK[date.getDay()] + ' ' + (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
            }
        },
        
        /**
         * Returns a speech formatted time, without a date, based on a period in the day. E.g.
         * '12:35 in the afternoon'
         */
        getFormattedTime: function (date) {
            var hours = date.getHours();
            var minutes = date.getMinutes();

            var periodOfDay;
            if (hours < 12) {
                periodOfDay = ' in the morning';
            } else if (hours < 17) {
                periodOfDay = ' in the afternoon';
            } else if (hours < 20) {
                periodOfDay = ' in the evening';
            } else {
                periodOfDay = ' at night';
            }

            hours = hours % 12;
            hours = hours ? hours : 12; // handle midnight
            minutes = minutes < 10 ? '0' + minutes : minutes;
            var formattedTime = hours + ':' + minutes + periodOfDay;
            return formattedTime;
        },

        /**
         * Returns a speech formatted, without a date, based on am/rpm E.g.
         * '12:35 pm'
         */
        getFormattedTimeAmPm: function (date) {
            var hours = date.getHours();
            var minutes = date.getMinutes();
            var ampm = hours >= 12 ? 'pm' : 'am';

            hours = hours % 12;
            hours = hours ? hours : 12; // handle midnight
            minutes = minutes < 10 ? '0' + minutes : minutes;
            var formattedTime = hours + ':' + minutes + ' ' + ampm;
            return formattedTime;
        }
    };
})();
module.exports = dateUtil;
