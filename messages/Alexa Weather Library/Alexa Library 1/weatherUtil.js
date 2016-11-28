/**
 Copyright 2016 IBM. All Rights Reserved.
 Developer: David Thomason
 */

var WU_ID = '';

var http = require('http');
var locationUtil = require('./locationUtil'), dateUtil = require('./dateUtil');
var sprintf = require("sprintf-js").sprintf;

/**
 * Provides weather utility to send a request to the Weather Underground 
 * and receive get a textual response
 */
var weatherUtil = (function () {
    
    return {
        
        /**
         * Uses Weather Underground API, documented: https://www.wunderground.com/weather/api
         *
         * Given, e.g.:
         * condition = "Weather"
         * city = "San Francisco"
         * state = "California" (or "" or null)
         * date = "2016-05-28" (or "current")
         *
         * Returns a verbal response:
         * "The Weather...
         */
        makeWeatherRequest: function(WU_ID, condition, city, state, date, callback) {
            
            // Clean up city, state and date input parameters
            
            city = city.toProperCase();
            var city_param = city.replace(/ /g, "_");
            
            var dateObject = date;
            if (!date.dataFeature) dateObject = dateUtil.getDateObject(date);
            if (dateObject.error) weatherResponseCallback(callback, new Error(dateObject.error));
            // console.log(dateObject);
            
            state = locationUtil.getProbableState(city, state);
            
            // Construct the URL from the input parameters
            
            var endpoint = 'http://api.wunderground.com/api/' + WU_ID + '/';
            var query = '/q/';
            if (state) query += locationUtil.getStateAbbrev(state) + '/';
            query += city_param + '.json';
            
            var url = endpoint + dateObject.dataFeature + query;
            // console.log('URL = ' + url);
            
            // Perform the HTTP Get request
            
            http.get(url, function (response) {
                
                var weatherResponseString = '';
                
                if (response.statusCode != 200) {
                    // console.log("Weather Underground Status Code Error: " + response.statusCode);
                    // console.log('Response: ' + response);
                    weatherResponseCallback(callback, new Error("I'm sorry, but the Weather Underground request returned a non-200 Response"));
                }
                
                response.on('data', function (data) { weatherResponseString += data; });
                
                response.on('end', function () {
                    var weatherResponseObject = JSON.parse(weatherResponseString);
                    var interpretation = interpretResponse(weatherResponseObject,city);
                    if (interpretation.error) weatherResponseCallback(callback, new Error(interpretation.error));
                    else weatherResponseCallback(callback, null, interpretation, condition, city, state, dateObject);
                });
            }).on('error', function (e) {
                // console.log("Communications error: " + e.message);
                weatherResponseCallback(callback, new Error("I'm sorry, but there was a communication error with The Weather Underground."));
            });
        }
    };
})();

/**
 * Returns an object with status and appropriate data
 * Used to perform the next step in the weatherResponseCallback function
 */
function interpretResponse(weatherResponseObject, city) {
    
    if (weatherResponseObject.response.error) {
        // console.log("Weather Underground API error: " + weatherResponseObject.response.error);
        var msg = weatherResponseObject.response.error.description;
        if(weatherResponseObject.response.error.type == "querynotfound") msg += " for "+city;
        if(weatherResponseObject.response.error.type == "keynotfound") msg = "Please provide a Weather Underground API key.";
        return {error: msg};
    } else {
    
        if (weatherResponseObject.current_observation) {
            return {
                status: 'successful',
                state: weatherResponseObject.current_observation.display_location.state,
                current: weatherResponseObject.current_observation,
             };
        } else if (weatherResponseObject.forecast) {
            return {
                status: 'successful',
                forecast: weatherResponseObject.forecast
            };
        }
        else {
            var us_cities = weatherResponseObject.response.results.filter(function (result) {
                return result.country == 'US'
            });
            if (us_cities.length == 1) {
                if (us_cities[0].city == city){
                    return {
                        status: 'redo',
                        state: us_cities[0].state
                    }
                } else
                    return { error: 'No citites match your search for '+city};
            } else {
                return {
                    status: 'multiple_us_cities',
                    number: us_cities.length
                };
            }
        }
    }
}

function weatherResponseCallback(callback, error, weatherResponse, condition, city, state, date) {
    
    var weatherReply;
    if (error) {
        callback({tell: error.message});
    } else {
        
        if (weatherResponse.status == 'successful') {
            
            if (!state && weatherResponse.current) {
                state = locationUtil.getStateName(weatherResponse.state);
            } else if (!state) {
                state = '';
            }
            
            var displayCondition = (condition == 'UV') ? condition : condition.toLowerCase();
            if ((condition == 'Rain' || condition == 'Snow') && weatherResponse.current) displayCondition = 'weather';
            else if (condition == 'UV') displayCondition += " index";
            else if (condition == 'FeelsLike') displayCondition = 'temperature';
            
            weatherReply = sprintf("The %s in %s, %s", displayCondition, city, state);
            if (condition != 'FeelsLike') weatherReply;
            if (!(condition == 'UV' && weatherResponse.forecast)) weatherReply += date.displayDate;
            
            var forecast;
            if(weatherResponse.forecast && condition != 'Weather'){
                forecast = weatherResponse.forecast.simpleforecast.forecastday.filter(function (day) {
                    return day.date.year == date.year && day.date.month == date.month && day.date.day == date.day;
                })[0];
                // console.log(forecast);
            }
            switch (condition) {
                case 'Weather':
                    if (weatherResponse.current) {
                        weatherReply += weatherResponse.current.weather;
                        weatherReply += " and the temperature is " + weatherResponse.current.temp_f + " degrees Fahrenheit";
                    } else {
                        forecast = weatherResponse.forecast.txt_forecast.forecastday.filter(function (day) {
                            return day.period == date.period;
                        })[0];
                        // console.log(forecast);
                        var weather = forecast.fcttext;
                        weather = weather.replace(/([0-9]*)F/g, '$1 degrees Fahrenheit');
                        weather = weather.replace(/Winds ([A-Z]*)/g, replaceCardinalPoint);
                        weatherReply += weather;
                    }
                    break;
                case 'Temperature':
                    if (weatherResponse.current) {
                        weatherReply += weatherResponse.current.temp_f + " degrees Fahrenheit";
                    } else {
                        weatherReply += "a high of " + forecast.high.fahrenheit + " degrees fahrenheit";
                        weatherReply += " and a low of " + forecast.low.fahrenheit + " degrees fahrenheit";
                    }
                    break;
                case 'Rain':
                    if (weatherResponse.current) {
                        weatherReply += weatherResponse.current.weather +
                            " and there has been " + parseFloat(weatherResponse.current.precip_1hr_in) + " inches of rain in the past hour"
                    } else {
                        weatherReply += parseFloat(forecast.qpf_allday.in) + " inches.";
                    }
                    break;
                case 'Snow':
                    if (weatherResponse.current) {
                        weatherReply += weatherResponse.current.weather;
                        if (weatherResponse.current.weather.toLowerCase().indexOf('snow') < 0) weatherReply += ' so there is no snow.';
                    } else {
                        weatherReply += parseFloat(forecast.snow_allday.in) + " inches.";
                    }
                    break;
                case 'UV':
                    if (weatherResponse.current) {
                        var uv_index = Number(weatherResponse.current.UV);
                        weatherReply += uv_index + ' which is ' + getRisk(uv_index) + ' risk';
                    } else weatherReply += " cannot be forecast, but the weather will be " + forecast.conditions + ".";
                    break;
                case 'Wind':
                    if (weatherResponse.current) weatherReply += weatherResponse.current.wind_string;
                    else weatherReply += "from the " + SPOKEN_CARDINAL_POINT[forecast.avewind.dir] + " at " + forecast.avewind.mph + " gusting to " + forecast.maxwind.mph + " mph.";
                    break;
                case 'Humidity':
                    if (weatherResponse.current) weatherReply += weatherResponse.current.relative_humidity;
                    else weatherReply += forecast.avehumidity + "%.";
                    break;
                case 'FeelsLike':
                    if (weatherResponse.current) weatherReply += ' feels like ' + weatherResponse.current.feelslike_f + ' degrees Fahrenheit.';
                    else {
                        weatherReply += "a high of " + forecast.high.fahrenheit + " degrees fahrenheit";
                        weatherReply += " and a low of " + forecast.low.fahrenheit + " degrees fahrenheit";
                    }
                    break;
            }
            callback({tell: weatherReply});
            
        } else if (weatherResponse.status == 'redo') {
            state = locationUtil.getStateName(weatherResponse.state);
            // console.log('redoing for ' + city + ', ' + state);
            weatherUtil.makeWeatherRequest(condition, city, state, date, callback);
            
        } else if (weatherResponse.status == 'multiple_us_cities') {
            // if(state) console.log("No city " + city + " found in " + state);
            // console.log("Got " + weatherResponse.number + " cities " + " named " + city + " in the US.");
            callback({ask: "Which state?"});
        } else {
            console.log(weatherResponse);
        }
    }
}

/**
 * Returns risk factor from UV index
 */
function getRisk(uv_index) {
    if (uv_index < 3) return 'low';
    else if (uv_index < 6) return 'moderate';
    else if (uv_index < 8) return 'high';
    else if (uv_index < 11) return 'very high';
    else return 'extreme';
}

function replaceCardinalPoint(match, p1, offset, string) {
    return 'Winds '+SPOKEN_CARDINAL_POINT[p1];
}

var SPOKEN_CARDINAL_POINT = {
    'N': 'North',
    'NNE': 'North-northeast',
    'NE': 'Northeast',
    'ENE': 'East-northeast',
    'E': 'East',
    'ESE': 'East-southeast',
    'SE': 'Southeast',
    'SSE': 'South-southeast',
    'S': 'South',
    'SSW': 'South-southwest',
    'SW': 'Southwest',
    'WSW': 'West-southwest',
    'W': 'West',
    'WNW': 'West-northwest',
    'NW': 'Northwest',
    'NNW': 'North-northwest'
};

String.prototype.toProperCase = function () {
    return this.replace(/\w*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

module.exports = weatherUtil;