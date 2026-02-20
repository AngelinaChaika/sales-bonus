/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  const { discount, sale_price: price, quantity } = purchase
  const calculatedDiscount = 1 - discount / 100
  const operationRevenue = price * quantity * calculatedDiscount
  return operationRevenue
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */

function calculateBonusByProfit(index, total, seller) {
  let { profit } = seller
  switch (index) {
    case 0:
      profit = 15
      break
    case 1:
    case 2:
      profit = 10
      break
    case total - 1:
      profit = 0
      break
    default:
      profit = 5
      break
  }
  return profit
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */

function analyzeSalesData(data, options) {
  if (!data
    || !Array.isArray(data.sellers)
    || data.sellers.length === 0
  ) {
    throw new Error('Некорректные входные данные');
  }

  const { sellers, products, purchase_records: purchase } = data
  const { calculateRevenue, calculateBonus } = options

  if (!calculateRevenue || !calculateBonus ) {
    throw new Error('Чего-то не хватает');
  }

  const statsBySellerId = {}

  const sellerIndex = sellers.reduce(
    (result, seller) => ({
      ...result,
      [seller.id]: seller,
    }),
    {}
  )

  const productIndex = products.reduce(
    (result, product) => ({
      ...result,
      [product.sku]: product,
    }),
    {}
  )

  purchase.forEach((record) => {
    const sellerId = record.seller_id
    const seller = sellerIndex[sellerId]

    if (!statsBySellerId[sellerId]) {
      statsBySellerId[sellerId] = {
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
      }
    }

    statsBySellerId[sellerId].sales_count += 1

    record.items.forEach((item) => {
      const product = productIndex[item.sku]
      const cost = product.purchase_price * item.quantity
      const revenue = calculateSimpleRevenue(item, product)
      const profitItem = revenue - cost

      statsBySellerId[sellerId].revenue += revenue
      statsBySellerId[sellerId].profit += profitItem

      if (!statsBySellerId[sellerId].products_sold[item.sku]) {
        statsBySellerId[sellerId].products_sold[item.sku] = 0
      }

      statsBySellerId[sellerId].products_sold[item.sku] += item.quantity
    })
  })

  const sellersStats = Object.values(statsBySellerId)

  sellersStats.sort((a, b) => b.profit - a.profit)

  sellersStats.forEach((seller, index) => {
    seller.bonus = calculateBonusByProfit(index, sellersStats.length, seller)
    const makeSellerTopProducts = (productsSold) => {
      const productsObj = Object.entries(productsSold)
      const productsArr = productsObj.map((item) => ({
        sku: item[0],
        quantity: item[1],
      }))
      productsArr.sort((a, b) => b.quantity - a.quantity)
      return productsArr.slice(0, 10)
    }
    seller.top_products = makeSellerTopProducts(seller.products_sold)
  })

  const finalReportSellers = sellersStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: seller.bonus,
  }))
  return finalReportSellers
}
