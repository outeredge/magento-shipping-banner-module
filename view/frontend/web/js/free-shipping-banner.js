define([
    'jquery',
    'uiComponent',
    'Magento_Customer/js/customer-data',
    'underscore',
    'knockout',
    'Magento_Catalog/js/price-utils'
], function($, Component, customerData, _, ko, priceUtils) {
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
                if (!_.isElement(cartData)) {
                    self.subtotal = self.calculateSubtotalWithTax(cartData);
                }
            });

            self.message = ko.computed(function () {
                var message;

                if (_.isUndefined(self.subtotal) || self.subtotal === 0) {
                    self.messageClass = 'default';
                    message = self.messageDefault;
                    self.updateTargetMessage(message);
                    return message;
                }

                if (self.subtotal > 0 && self.subtotal < self.freeShippingThreshold) {
                    self.messageClass = 'less-than-amount';
                    var subtotalRemaining = self.freeShippingThreshold - self.subtotal;
                    var formattedSubtotalRemaining = self.formatCurrency(subtotalRemaining);
                    message = self.messageItemsInCart.replace('XX.XX', formattedSubtotalRemaining);
                    self.updateTargetMessage(message);
                    return message;
                }

                if (self.subtotal >= self.freeShippingThreshold) {
                    self.messageClass = 'free-shipping';
                    message = self.messageFreeShipping;
                    self.updateTargetMessage(message);
                    return message;
                }
            });
        },
        calculateSubtotalWithTax: function (cartData) {
            if (!cartData || !cartData.items || cartData.items.length === 0) {
                return 0;
            }
            
            var total = 0;
            cartData.items.forEach(function(item) {
                var rawPrice = item.product_price_value || 0;
                var itemPrice = 0;
                if (typeof rawPrice === 'object') {
                    if (rawPrice.incl_tax !== undefined) {
                        itemPrice = parseFloat(rawPrice.incl_tax) || 0;
                    } else if (rawPrice.excl_tax !== undefined) {
                        itemPrice = parseFloat(rawPrice.excl_tax) || 0;
                    }
                } else {
                    itemPrice = parseFloat(rawPrice) || 0;
                }
                var itemQty = parseInt(item.qty || 0, 10);
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
        },
        updateTargetMessage: function (message) {
            if (!this.targetSelector || !message) {
                return;
            }

            var $target = $(this.targetSelector).first();
            if ($target.length === 0) {
                return;
            }

            var $message = $target.find('[data-free-shipping-promo-message]').first();
            if ($message.length === 0) {
                $target.html('<p style="font-size: 12pt;"><strong data-free-shipping-promo-message></strong></p>');
                $message = $target.find('[data-free-shipping-promo-message]').first();
            }

            $message.text(message);
        }
    });
});