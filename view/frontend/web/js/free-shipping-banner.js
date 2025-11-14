define([
    'uiComponent',
    'Magento_Customer/js/customer-data',
    'underscore',
    'knockout',
    'Magento_Catalog/js/price-utils'
], function(Component, customerData, _, ko, priceUtils) {
    'use strict';

    return Component.extend({
        defaults: {
            template: 'OuterEdge_FreeShippingPromo/free-shipping-banner',
            subtotal: 0.00,
            messageClass: 'default',
            tracks: {
                subtotal: true,
                messageClass: true
            }
        },
        initialize: function () {
            this._super();
            var self = this;
            var cart = customerData.get('cart');

            customerData.getInitCustomerData().done(function () {
                if (!_.isElement(cart())) {
                    self.subtotal = self.calculateSubtotalWithTax(cart());
                }
            });

            cart.subscribe(function (cartData) {
                if (!_.isElement(cartData) && cartData.items && cartData.items.length > 0) {
                    self.subtotal = self.calculateSubtotalWithTax(cartData);
                }
            });

            self.message = ko.computed(function () {
                if (_.isUndefined(self.subtotal) || self.subtotal === 0) {
                    self.messageClass = 'default';
                    return self.messageDefault;
                }

                if (self.subtotal > 0 && self.subtotal < self.freeShippingThreshold) {
                    self.messageClass = 'less-than-amount';
                    var subtotalRemaining = self.freeShippingThreshold - self.subtotal;
                    var formattedSubtotalRemaining = self.formatCurrency(subtotalRemaining);
                    return self.messageItemsInCart.replace('XX.XX', formattedSubtotalRemaining);
                }

                if (self.subtotal >= self.freeShippingThreshold) {
                    self.messageClass = 'free-shipping';
                    return self.messageFreeShipping;
                }
            });
        },
        calculateSubtotalWithTax: function (cartData) {
            if (!cartData || !cartData.items || cartData.items.length === 0) {
                return 0;
            }
            
            var total = 0;
            cartData.items.forEach(function(item) {
                // product_price_value contains the price including tax
                var itemPrice = parseFloat(item.product_price_value || 0);
                var itemQty = parseInt(item.qty || 0);
                total += itemPrice * itemQty;
            });
            
            return total;
        },
        formatCurrency: function (value) {
            let priceFormat = {
                decimalSymbol: '.',
                groupLength: 3,
                groupSymbol: ",",
                integerRequired: false,
                precision: 2,
                requiredPrecision: 2
            };
            return priceUtils.formatPriceLocale(value, priceFormat, false);
        }
    });
});