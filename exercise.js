/**
 * A collection class to manage the set.
 * @param {Array} data List of products available
 */
function Collection(data) {
  return {
    model: data,

    length: data.length,

    /**
     * Returns a product that matches the id passed
     * @param  {String} id Product id
     * @return {Object}    The product object
     */
    all: function(matchingFunc) {
      var retArr = [];

      for (var i = 0, len = this.model; i<len; i++){
        if(matchingFunc(this.model[i])) retArr.push(this.model[i]);
      }

      return retArr;
    },

    first: function(matchingFunc) {
      for (var i = 0, len = this.model.length; i<len; i++){
        if(matchingFunc(this.model[i])) return this.model[i];
      }
    }
  };
}

/**
 * Supermarket Class. Controller for the overall process of checking out.
 * 
 * @param {Array} stock Current product stock
 */
function Supermarket(stock) {

  return {
    /**
     * @type {Array}
     */
    stock: new Collection(stock),
    
    /**
     * Our "main" function to handle the overall checkout.
     * 
     * @param  {String} items A string of (what should be) undelimited single letter
     *                        item IDs
     *                        
     * @return {[type]}       [description]
     */
    checkout: function(items) {
      var itemsArr = items.replace(' ', '').split(''),
          total = 0,
          productCollection = [];
      
      function itemByName(item){ return item.name === itemsArr[i]; }

      // Go through each item
      for (var i = 0, len = itemsArr.length; i < len; i++) {
        // Get the product and its price, then add it to the total
        if (product = this.stock.first(itemByName)) {
          productCollection.push(product);
          total += product.price;
          console.log(total, product.name);
        } else {
          console.error('Unrecognized item.');
        }
      }

      return this.applyDiscounts(new Collection(productCollection), total);
    },

    /**
     * Controller method for delegating discounting tasks.
     * 
     * @param  {Number} total Total amount of products thus far.
     * @return {Number}       Total after discounts.
     */
    applyDiscounts: function(productCollection, total) {
      var discounter = new Discounter(productCollection, discountsMockData);
      return total + discounter.getDiscount();
    }
  };
}

function Discounter(productCollection, discountCollection) {
  return {
    checkedItems: productCollection,
    discountsAvailable: discountCollection,

    /**
     * Returns the amount to discount from the total.
     * 
     * @return {Number} typically negative number representing discount amount
     */
    getDiscount: function() {
      var discountsAvailable = this.getAllDiscounts();
      var unconflicted = this.resolveConflicting(discountsAvailable);
      var discountedTotal = 0;

      unconflicted.forEach(function(discount){
        discountedTotal += discount.amount
      });

      return discountedTotal;
    },

    /**
     * Provides an array of all available discounts that can be applied to this
     * group of items.
     * 
     * @return {Array} 
     */
    getAllDiscounts: function() {
      var discounts = [];

      this.discountsAvailable.forEach(function(discountAvailable) {

        var hasDiscountableItems = this.checkedItems.first(function(product){ 
          return (discountAvailable.products.indexOf(product) > -1); 
        });

        if (hasDiscountableItems){
          discounts.push({
            amount: this.DISCOUNT_FUNCTIONS[discountAvailable.rules.discountFunc].apply(this, [discountAvailable, this.checkedItems]),
            discount: discountAvailable
          });
        }
      }, this);

      return discounts;
    },

    /**
     * Resolves conflicting discounts. This defaults so that if there is a discount
     * that can't be used in conjunction with another one, it automatically
     * opts for the higher discount of the two if they both apply.
     * 
     * @return {Array} Array of non-conflicting discounts. 
     */
    resolveConflicting: function(discounts) {
      // We sort so we know that any conflicts we find means we can strip this
      // discount out.
      var sorted = discounts.sort(function(a, b) {
        return b.amount - a.amount;
      });

      // Worst case: unknowable since 
      // Go through each discount, starting from lowest
      sorted.forEach(function(discount, idx){
        idx++; // useful for scanning the rest of the array.

        // if the discount has a "can't be used with" policy
        if (discount.discount.rules.cantBeUsedWith.length > 0) {

          // check this discount against the remaining (higher) discounts
          for (var len = discounts.length; idx < len; idx++) {

            // If it can't be used with ANY other discount or if it can't
            // be used with the discount in question, remove it.
            if (discount.discount.rules.cantBeUsedWith[0] === "ANY" ||
                discount.discount.rules.cantBeUsedWith.indexOf(discounts[idx].discount.id) > -1) {
              sorted = sorted.slice(1);
            }
          }
        }
      });

      return sorted;
    },

    /**
     * A set of functions that modularly apply discounts. Add any new discount
     * functions as needed. Feel free to make assumptions as necessary about
     * the discount makeup.
     * 
     * @type {Object}
     */
    DISCOUNT_FUNCTIONS: {

      /**
       * Function to figure a discount based on buy x, pay for y type of discount
       * 
       * @param {Array} cartItems An array of products in the cart
       * @return {number} typically negative number representing discount amount
       */
      XforY: function(discount, productCollection) {
        var x = discount.rules.parameters[0],
            y = discount.rules.parameters[1],
            discountedPrice = 0,
            itemsDiscountable = 0,
            numberOfDiscounts = 0;

        for (var i = 0, len = productCollection.length; i < len; i++) {
          if (discount.products[0].name === productCollection.model[i].name) {
            // Add a qualifying item
            itemsDiscountable++;

            // if you get to the number of items that qualify
            if (itemsDiscountable % x === 0) {
              // Add a discount
              numberOfDiscounts++;
            }
          }
        }

        return -((((x-y)/x) * (discount.products[0].price * x)) * numberOfDiscounts);
      }
    }
  };
}

/**
 * Polyfill for ES6 find method
 * 
 * @param  {Any} desired What we're trying to find
 * @return {Any}         What we found, or false if we didn't
 */
Array.prototype.find = Array.prototype.find || function(desired) {
  var found = false;

  this.forEach(function(v) {
    if (v === desired) {
      found = v;
      return;
    }
  });

  return found;
};

/**
 * Reduces a paramater to a single value.
 * 
 * @param  {Function} reduceFunc A function whose return value becomes the first
 *                               parameter the next time that function is called.
 * @return {Any}                 The reduced value
 */
Array.prototype.reduce = Array.prototype.reduce || function(reduceFunc) {
  var retVal;

  this.forEach(function(currentVal){
    if (retVal === undefined) {
      retVal = this[0];
    } else {
      retVal = reduceFunc(retVal, currentVal);
    }
  });

  return retVal;
};

var productMockData = [{
  name: "A",
  price: 20
},{
  name: "B",
  price: 50
}, {
  name: "C",
  price: 30
}];

// Break out discounts data so that it's
// more easily applied to the checkout data
// Note: we'd probably normally join this data with IDs
var discountsMockData = [{
  id: "0",
  products: [productMockData[1]], // "B"
  rules: {
    discountFunc: "XforY",
    parameters: [5, 3],
    cantBeUsedWith: []
  }
},{
  id: "1",
  products: [productMockData[0]], // "A"
  rules: {
    discountFunc: "XforY",
    parameters: [3, 1],
    cantBeUsedWith: ["0"]
  }
}];

var supermarket = new Supermarket(productMockData);

console.log(supermarket.checkout('ABBACBBAB')); //240 (uses 0's discount)
console.log(supermarket.checkout('BBBAABBBAABBBAACCCB')); //510 (uses 0's discount)
console.log(supermarket.checkout('BBBBBAAAAAAAAA')); //210 (uses 1's discount)