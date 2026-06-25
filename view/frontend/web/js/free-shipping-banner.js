define([
    'jquery',
    'jquery/jquery.cookie',
    'uiComponent',
    'Magento_Customer/js/customer-data',
    'underscore',
    'knockout',
    'Magento_Catalog/js/price-utils'
], function($, _cookiePlugin, Component, customerData, _, ko, priceUtils) {
    'use strict';

    /**
     * Reads the current OuterEdge_TaxSwitcher toggle state. Mirrors the source
     * of truth used by OuterEdge_TaxSwitcher/js/tax-toggle (body class first,
     * cookie fallback).
     *
     * @returns {boolean|null} true = inc-tax, false = ex-tax, null = unknown
     */
    function readTaxToggleState() {
        if (document.body && document.body.classList) {
            if (document.body.classList.contains('prices-inc-tax')) {
                return true;
            }
            if (document.body.classList.contains('prices-excl-tax')) {
                return false;
            }
        }
        var cookieVal = $.cookie('taxToggle');
        if (cookieVal === 'prices-inc-tax') {
            return true;
        }
        if (cookieVal === 'prices-excl-tax') {
            return false;
        }
        return null;
    }

    function resolveInclusive(state, fallback) {
        if (state === true || state === false) {
            return state;
        }
        var detected = readTaxToggleState();
        if (detected !== null) {
            return detected;
        }
        return fallback;
    }

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
            self._baseFreeShippingThreshold = parseFloat(self.freeShippingThreshold) || 0;
            self._taxSwitcherBannerState = readTaxToggleState();

            if (typeof MutationObserver !== 'undefined' && document.body) {
                self._taxSwitcherBannerObserver = new MutationObserver(function () {
                    var detected = readTaxToggleState();
                    if (detected !== null && detected !== self._taxSwitcherBannerState) {
                        self._taxSwitcherBannerState = detected;
                        self._taxSwitcherBannerRefresh();
                    }
                });
                self._taxSwitcherBannerObserver.observe(document.body, {
                    attributes: true,
                    attributeFilter: ['class']
                });
            }

            if (self._taxSwitcherBannerState !== null) {
                self._taxSwitcherBannerRefresh();
            }

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
        calculateSubtotalWithTax: function (cartData, useInclusive) {
            if (!cartData || !cartData.items || cartData.items.length === 0) {
                return 0;
            }

            var inclusive;
            if (typeof useInclusive === 'boolean') {
                inclusive = useInclusive;
            } else {
                inclusive = resolveInclusive(this._taxSwitcherBannerState, true);
            }

            var total = 0;
            cartData.items.forEach(function(item) {
                var rawPrice = item.product_price_value || 0;
                var itemPrice = 0;
                if (typeof rawPrice === 'object') {
                    if (inclusive && rawPrice.incl_tax !== undefined) {
                        itemPrice = parseFloat(rawPrice.incl_tax) || 0;
                    } else if (!inclusive && rawPrice.excl_tax !== undefined) {
                        itemPrice = parseFloat(rawPrice.excl_tax) || 0;
                    } else if (rawPrice.incl_tax !== undefined) {
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
        _taxSwitcherBannerRefresh: function () {
            var cartData = customerData.get('cart')();
            if (!cartData || !cartData.items || cartData.items.length === 0) {
                return;
            }
            var useInclusive = resolveInclusive(this._taxSwitcherBannerState, true);
            // The configured threshold is treated as inc-VAT (matching how
            // merchandising enters the figure). In inc-VAT view it stays as
            // configured; in ex-VAT view we divide by the cart's tax
            // multiplier to get the ex-VAT equivalent.
            var taxMultiplier = this._taxSwitcherBannerGetTaxMultiplier(cartData);
            this.freeShippingThreshold = useInclusive
                ? this._baseFreeShippingThreshold
                : this._baseFreeShippingThreshold / taxMultiplier;
            this.subtotal = this.calculateSubtotalWithTax(cartData, useInclusive);
        },
        _taxSwitcherBannerGetTaxMultiplier: function (cartData) {
            if (!cartData || !cartData.items || cartData.items.length === 0) {
                return 1;
            }
            var inclTotal = 0;
            var exclTotal = 0;
            cartData.items.forEach(function (item) {
                var rawPrice = item.product_price_value || 0;
                var incl = 0;
                var excl = 0;
                if (typeof rawPrice === 'object') {
                    incl = parseFloat(rawPrice.incl_tax) || 0;
                    excl = parseFloat(rawPrice.excl_tax) || 0;
                } else {
                    incl = parseFloat(rawPrice) || 0;
                    excl = incl;
                }
                var qty = parseInt(item.qty || 0, 10);
                inclTotal += incl * qty;
                exclTotal += excl * qty;
            });
            if (exclTotal > 0) {
                return inclTotal / exclTotal;
            }
            return 1;
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
                $target.html('<p><strong data-free-shipping-promo-message></strong></p>');
                $message = $target.find('[data-free-shipping-promo-message]').first();
            }

            $message.text(message);
        }
    });
});
