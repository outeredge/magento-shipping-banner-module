define([
    'uiComponent',
    'underscore',
], function (Component, _) {
    'use strict';

    return Component.extend({
        component: 'OuterEdge_FreeShippingPromo/js/breeze/free-shipping-banner',
        defaults: {
            subtotal: 0.00,
            messageClass: 'default',
            messageText: '',
            tracks: {
                subtotal: true,
                messageClass: true
            }
        },
        initialize: function () {
            this._super();
            const self = this;
            const cart = $.sections.get('cart');
            self.subtotal = cart().subtotalAmount;

            $.sections.get('cart').subscribe(function (cart) {
                if (!_.isElement(cart) && !_.isUndefined(cart.subtotalAmount)) {
                    // Update the subtotal and message when the cart changes.
                    self.subtotal = parseFloat(cart.subtotalAmount);
                    self.updateMessage();
                }
            });

            // Update the message initially.
            self.updateMessage();
        },
        updateMessage: function () {
            if (!this.subtotal || this.subtotal === 0) {
                // Set the message to 'default' when subtotal is zero.
                this.setMessage('default', this.messageDefault);
            } else if (this.subtotal > 0 && this.subtotal < this.freeShippingThreshold) {
                // Calculate remaining amount for free shipping and set the message class and text.
                const subtotalRemaining = this.freeShippingThreshold - this.subtotal;
                const formattedSubtotalRemaining = this.formatCurrency(subtotalRemaining);
                const message = this.messageItemsInCart.replace('XX.XX', formattedSubtotalRemaining)
                this.setMessage('less-than-amount', message);
            } else if (this.subtotal >= this.freeShippingThreshold) {
                // Set the message to 'free-shipping' when subtotal meets or exceeds the threshold.
                this.setMessage('free-shipping', this.messageFreeShipping);
            }
            this.renderHTML();
        },
        setMessage: function (messageClass, messageText) {
            this.messageClass = messageClass;
            this.messageText = messageText || this.messageText;
        },
        renderHTML: function () {
            const html = `<div><span class="${this.messageClass}">${this.messageText}</span></div>`;
            this.element.html(html);
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
            return $.catalog.priceUtils.formatPriceLocale(value, priceFormat, false);
        }
    });
});
