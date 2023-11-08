<?php

namespace OuterEdge\FreeShippingPromo\ViewModel;

use Magento\Framework\View\Element\Block\ArgumentInterface;
use Magento\Store\Model\ScopeInterface;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\Serialize\Serializer\Json;

class Message implements ArgumentInterface
{
    const XML_IS_ENABLED_CONFIG_PATH = 'outeredge_freeshippingpromo/general/enable';
    const XML_FREE_SHIPPING_THRESHOLD_CONFIG_PATH = 'outeredge_freeshippingpromo/general/free_shipping_threshold_amount';
    const XML_MESSAGE_DEFAULT_CONFIG_PATH = 'outeredge_freeshippingpromo/message/message_default';
    const XML_MESSAGE_ITEMS_IN_CART_CONFIG_PATH = 'outeredge_freeshippingpromo/message/message_items_in_cart';
    const XML_MESSAGE_FREE_SHIPPING_CONFIG_PATH = 'outeredge_freeshippingpromo/message/message_free_shipping';

    private $scopeConfig;
    private $json;

    public function __construct(
        ScopeConfigInterface $scopeConfig,
        Json $json
    ) {
        $this->scopeConfig = $scopeConfig;
        $this->json = $json;
    }

    public function getIsEnabled() {
        return $this->scopeConfig->getValue(self::XML_IS_ENABLED_CONFIG_PATH,
            ScopeInterface::SCOPE_STORE
        );
    }

    public function getFreeShippingThresholdAmount() {
        return $this->scopeConfig->getValue(self::XML_FREE_SHIPPING_THRESHOLD_CONFIG_PATH,
            ScopeInterface::SCOPE_STORE
        );
    }

    public function getDefaultMessage() {
        return $this->scopeConfig->getValue(self::XML_MESSAGE_DEFAULT_CONFIG_PATH,
            ScopeInterface::SCOPE_STORE
        );
    }

    public function getItemsInCartMessage() {
        return $this->scopeConfig->getValue(self::XML_MESSAGE_ITEMS_IN_CART_CONFIG_PATH,
            ScopeInterface::SCOPE_STORE
        );
    }

    public function getFreeShippingMessage() {
        return $this->scopeConfig->getValue(self::XML_MESSAGE_FREE_SHIPPING_CONFIG_PATH,
            ScopeInterface::SCOPE_STORE
        );
    }

    public function getConfig() {
        $config = [
            'freeShippingThreshold' => $this->getFreeShippingThresholdAmount(),
            'messageDefault' => $this->getDefaultMessage(),
            'messageItemsInCart' => $this->getItemsInCartMessage(),
            'messageFreeShipping' => $this->getFreeShippingMessage(),
        ];
        return $this->json->serialize($config);
    }
}
