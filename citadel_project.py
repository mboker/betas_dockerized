from flask import Flask, render_template
from flask_restful import Resource, Api
from flask import g, request, make_response
import pandas as pd
from service import calculator
import sqlite3

quandl_key = '5MzkPyT6BEVVv3u9-kkH'
alphavantage_key = 'LLU8D8CBCS87GWXU'
DATABASE = 'beta_schema.db'

market = None


class BetasForSymbols(Resource):
    def post(self):
        form = request.form
        start_date = form['start']
        end_date = form['end']
        symbols = form.getlist('symbols[]')
        window = int(form['window'])
        empty_stocks = []

        collection = market.copy()
        for symbol in symbols:
            try:
                stock = pd.read_csv(app.open_resource('data/dailies/daily_'+symbol+'.csv'),
                        usecols=['date', 'close'], parse_dates=['date'],index_col='date').sort_index()
            except FileNotFoundError:
                stock = pd.read_csv('https://www.quandl.com/api/v3/datatables' +
                                    '/WIKI/PRICES.csv?date.gte=20071130&ticker=' + symbol + '&api_key='+quandl_key,
                                    usecols=['date', 'close'], parse_dates=['date'],
                                    index_col='date').sort_index()
                if len(stock.values) == 0 :
                    stock = pd.read_csv('https://www.alphavantage.co/query?function=TIME_SERIES_DAILY'+
                                        '&datatype=csv&outputsize=full&symbol='+symbol+'&apikey=' + alphavantage_key,
                                        usecols=['timestamp', 'close'], parse_dates=['timestamp'],
                                        index_col='timestamp').sort_index()
                    stock.index.names = ['date']
                stock = stock['2007-11-30':]
                f = open(app.root_path+'/data/dailies/daily_'+symbol+'.csv', 'w')
                csv_string = stock.to_csv()
                f.write(csv_string)
                f.close()

            stock.columns = [symbol]
            stock = stock[start_date:end_date]
            if len(stock.values) > 0:
                collection = collection.join(stock, how='left')
            else:
                empty_stocks.append(symbol)

        collection = collection[start_date:end_date]
        if window > len(collection.values):
            return make_response('{"error":"The window you selected is larger than the number of trading days in your '
                                 'date range.  Please select a wider range or a smaller window."}')

        betas = calculator.calculate(collection, window)

        return make_response('{"betas":'+
                             betas.to_json(orient='columns', date_format='iso') + ',' +
                             '"empty_stocks":' + str(empty_stocks).replace('\'', '"') + '}')


class Company(Resource):
    def get(self):
        args = request.args
        # companies = company.get_companies(query_string)
        query_string = args['q']
        companies = get_companies(query_string)
        return {'companies' : companies}


def get_companies(query_string):
    cur = get_company_db().cursor()
    cur.execute("select SYMBOL AS id, NAME, SYMBOL || ' - ' || NAME AS DISPLAY " +
                "from COMPANY where NAME like '%"+query_string + "%' or " +
                "symbol like '%"+query_string+"%'")
    rows = cur.fetchall()
    return rows


def initialize_app():
    app = Flask(__name__)
    global market
    market = pd.read_csv(app.open_resource('data/dailies/market.csv'),
                                usecols=['timestamp', 'close'], parse_dates=['timestamp'], index_col='timestamp')
    market.columns = ['MKT']
    return app


def get_company_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(app.root_path+'/'+DATABASE)
    db.row_factory = make_dicts
    return db


def make_dicts(cursor, row):
    return dict((cursor.description[idx][0], value)
                for idx, value in enumerate(row))


app = initialize_app()
with app.app_context():
    get_company_db()
api = Api(app)
api.add_resource(BetasForSymbols, '/betas')
api.add_resource(Company, '/companies')


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


@app.route('/')
def index():
    return render_template('index.html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)
