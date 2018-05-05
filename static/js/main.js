var betas = {},
    symbols = [],
    startDate = null,
    endDate = null;

$("#symbol_input").tokenInput("/companies",
    {
        'minChars': 2,
        'searchDelay': 200,
        'jsonContainer': 'companies',
        'propertyToSearch': 'DISPLAY',
        'theme': 'mac',
        'onAdd': function (item) {
            symbols.push(item.id);
        },
        'onDelete': function (item) {
            var idx = symbols.indexOf(item.id);
            if (idx > -1){
                symbols.splice(idx, 1);
            }
            removeBeta(item.id);
            removeBeta('Aggregate');
        }
    });

$('#retrieve_button').on('click', function(){
    getBetas();
});

$('#window').on('change', function(){
   buildDateRangePicker();
});

function buildDateRangePicker() {
    var window = $('#window').val();

    if (getDaysBetween(startDate, endDate) <= window){
        startDate = null;
        endDate = null;
        $("#date_range").val('');
    }

    $("#date_range").dateRangePicker({
        autoClose: true,
        startDate: '2007-11-30',
        endDate: '2017-12-20',
        monthSelect: true,
        yearSelect: true,
        minDays: window,
        setValue: function (s) {
            if (!$(this).attr('readonly') && !$(this).is(':disabled') && s != $(this).val()) {
                startDate = s.substr(0, 10);
                endDate = s.substr(-10, 10);
                $(this).val(s);
            }
        }
    });
}

function removeBeta(symbol){
    delete betas[symbol];
    drawChart();
}

function getBetas() {
    var window = $('#window').val();
    betas = {};
    data = {'start': startDate,
            'end':endDate,
            'symbols':symbols,
            'window':window};

    loading.show();
    $.ajax({
        url: '/betas',
        method: 'POST',
        data: data,
        dataType: 'json',
        success: function (response) {
            if (response.error) {
                alert(response.error);
            }
            else {
                if (response.empty_stocks.length > 0) {
                    var alertString = 'Closing values could not be found for the following symbols in the date range' +
                        ' specified.  ';
                    response.empty_stocks.forEach(function (symbol) {
                        alertString += ' ' + symbol;
                    });
                    alert(alertString);
                }
                Object.keys(response.betas).forEach(function (symbol) {
                    betas[symbol] = response.betas[symbol];
                });
                drawChart();
            }
            loading.hide();
        }
    });
}

function drawChart() {
    var graphs = [];
    var valueAxes = []

    var chartDataObj = {};


    Object.keys(betas).forEach(function (symbol) {

        Object.keys(betas[symbol]).forEach(function (date) {
            if (!chartDataObj[date]) {
                chartDataObj[date] = {};
            }
            chartDataObj[date][symbol] = parseFloat(Math.round(betas[symbol][date] * 100) / 100).toFixed(2);;
        });

        if (symbol == 'Aggregate'){
             graphs.push(
                {
                    "id": symbol,
                    "bullet": "round",
                    "bulletBorderAlpha": 1,
                    "bulletColor": "#000000",
                    "lineColor": "#000000",
                    "bulletSize": 1,
                    "hideBulletsCount": 50,
                    "lineThickness": 4,
                    "title": symbol,
                    "useLineColorForBulletBorder": true,
                    "valueField": symbol
                });

            valueAxes.push({
                "id": symbol,
                "axisAlpha": 0,
                "position": "left",
                "ignoreAxisWidth": true
            });
        }
        else{
            graphs.push(
                {
                    "id": symbol,
                    "bullet": "round",
                    "bulletBorderAlpha": 1,
                    "bulletColor": "#FFFFFF",
                    "bulletSize": 1,
                    "hideBulletsCount": 50,
                    "lineThickness": 2,
                    "title": symbol,
                    "useLineColorForBulletBorder": true,
                    "valueField": symbol
                });

            valueAxes.push({
                "id": symbol,
                "axisAlpha": 0,
                "position": "left",
                "ignoreAxisWidth": true
            });
        }
    });

    var chartData = [];
    Object.keys(chartDataObj).forEach(function (date) {
        var currChange = chartDataObj[date];
        currChange['date'] = date;
        chartData.push(currChange);
    });
    var chart = AmCharts.makeChart("chart_div", {
        "type": "serial",
        "theme": "light",
        "marginRight": 40,
        "marginLeft": 40,
        "autoMarginOffset": 20,
        "mouseWheelZoomEnabled": true,
        "dataDateFormat": "YYYY-MM-DD",
        "legend": {
            "useGraphSettings": true
        },
        "valueAxes": valueAxes,
        "graphs": graphs,
        "chartScrollbar": {
            "graph": "g1",
            "oppositeAxis": false,
            "offset": 30,
            "scrollbarHeight": 80,
            "backgroundAlpha": 0,
            "selectedBackgroundAlpha": 0.1,
            "selectedBackgroundColor": "#888888",
            "graphFillAlpha": 0,
            "graphLineAlpha": 0.5,
            "selectedGraphFillAlpha": 0,
            "selectedGraphLineAlpha": 1,
            "autoGridCount": true,
            "color": "#AAAAAA"
        },
        "chartCursor": {
            "pan": true,
            "valueLineEnabled": true,

            "cursorAlpha": 1,
            "cursorColor": "#258cbb",
            "limitToGraph": "g1",
            "valueLineAlpha": 0.2,
            "valueZoomable": true
        },
        "valueScrollbar": {
            "oppositeAxis": false,
            "offset": 50,
            "scrollbarHeight": 10
        },
        "categoryField": "date",
        "categoryAxis": {
            "parseDates": true,
            "dashLength": 1,
            "minorGridEnabled": true
        },
        "dataProvider": chartData
    });

    chart.addListener("rendered", zoomChart);

    zoomChart();

    function zoomChart() {
        chart.zoomToIndexes(chart.dataProvider.length - 40, chart.dataProvider.length - 1);
    }
}

function getDaysBetween( date_string_1, date_string_2 ) {
  //Get 1 day in milliseconds
  var one_day=1000*60*60*24;
  var date1 = new Date(date_string_1);
  var date2 = new Date(date_string_2);

  // Convert both dates to milliseconds
  var date1_ms = date1.getTime();
  var date2_ms = date2.getTime();

  // Calculate the difference in milliseconds
  var difference_ms = date2_ms - date1_ms;

  // Convert back to days and return
  return Math.round(difference_ms/one_day);
}

buildDateRangePicker();

var loading = $('#loading_div');
loading.hide();