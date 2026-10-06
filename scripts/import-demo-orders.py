"""Import anonymous aggregates from the named demo store's Shopify order export.
No buyer data, order IDs, payment references, or raw CSV rows leave this script.
Run: python3 scripts/import-demo-orders.py /path/to/orders_export.csv
"""
import csv, sys, json, subprocess
from decimal import Decimal
from datetime import datetime, timezone
from collections import defaultdict


def cents(value):
    amount = Decimal(value or '0') * 100
    if amount != amount.to_integral_value() or amount < 0:
        raise ValueError('Expected non-negative USD cents.')
    return int(amount)


def aggregate(path):
    with open(path, newline='', encoding='utf-8-sig') as source:
        reader = csv.DictReader(source)
        required = {'Name', 'Financial Status', 'Payment Method', 'Subtotal', 'Currency', 'Created at', 'Lineitem name', 'Lineitem quantity', 'Cancelled at', 'Refunded Amount', 'Discount Amount'}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError('This is not the expected Shopify orders CSV.')
        orders = defaultdict(list)
        for row in reader:
            orders[row['Name']].append(row)
    baskets = {}
    dates = []
    for lines in orders.values():
        header = next((row for row in lines if row['Financial Status']), None)
        if not header or header['Financial Status'] != 'paid' or header['Cancelled at'] or cents(header['Refunded Amount']):
            continue
        if 'testing' not in header['Payment Method'].lower() or 'bogus' not in header['Payment Method'].lower():
            raise ValueError('Only the named demo store’s test-gateway orders are supported.')
        if header['Currency'] != 'USD' or cents(header['Discount Amount']):
            raise ValueError('Only USD orders without discounts are supported by this demo import.')
        items = defaultdict(int)
        for row in lines:
            quantity = int(row['Lineitem quantity'])
            if quantity < 1 or not row['Lineitem name']:
                raise ValueError('Invalid line item.')
            items[row['Lineitem name']] += quantity
        key = tuple(sorted(items.items()))
        subtotal = cents(header['Subtotal'])
        basket = baskets.setdefault(key, {'label':' + '.join(str(qty)+' × '+name for name,qty in key),'orderCount':0,'itemCount':sum(items.values()),'totalProductCents':0})
        basket['orderCount'] += 1
        basket['totalProductCents'] += subtotal
        dates.append(datetime.strptime(header['Created at'], '%Y-%m-%d %H:%M:%S %z').date().isoformat())
    if not dates:
        raise ValueError('No eligible paid test purchases. Existing snapshot was not changed.')
    return {'store':'build-sprint-demo.myshopify.com','currency':'USD','source':'shopify-admin-csv-test-orders','importedOn':datetime.now(timezone.utc).date().isoformat(),'periodStart':min(dates),'periodEnd':max(dates),'orderCount':len(dates),'totalProductCents':sum(b['totalProductCents'] for b in baskets.values()),'baskets':list(baskets.values())}


if __name__ == '__main__':
    try:
        snapshot = aggregate(sys.argv[1])
        subprocess.run(['npx','convex','run','purchases:saveSnapshot',json.dumps({'snapshot':snapshot})],check=True)
        print(json.dumps({'orders':snapshot['orderCount'],'productSubtotalUSD':snapshot['totalProductCents']/100,'aovUSD':round(snapshot['totalProductCents']/snapshot['orderCount']/100,2),'basketTypes':len(snapshot['baskets'])}))
    except (ValueError,KeyError,IndexError) as error:
        sys.exit(str(error))
