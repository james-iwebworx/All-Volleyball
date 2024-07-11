/* eslint-disable */

/**
 * Dependencies:
 * - Custom select component
 *
 * Required translation strings:
 * - addToCart
 * - noStock
 * - noVariant
 * - onlyXLeft
 */

if (!customElements.get('variant-picker')) {
  class VariantPicker extends HTMLElement {
    constructor() {
      super();
      this.section = this.closest('.js-product');
      this.productForm = this.section.querySelector('.js-product-form-main');
      this.optionSelectors = this.querySelectorAll('.option-selector');
      this.qtyOptionSelectors = this.querySelectorAll('.size-container');
      this.data = this.getProductData();
      this.decorateOptions = this.querySelectorAll('input[name="decorator-option"]');
      this.btnAddToCart = this.querySelector('.btn-add-to-cart');
      this.decorateButton = this.querySelector('.decorate-button');
      this.inputs = this.querySelectorAll('quantity-input input');
      this.qtyPlusButtons = this.querySelectorAll('quantity-input button.btn--plus');
      this.qtyAlertContainer = this.querySelector('.qty-message-alert');
      this.decoratorContainer = document.querySelector('.decorator-container');
      this.decoratorIframe = this.decoratorContainer.querySelector('iframe');
      this.shippingMessageContainer = this.section.querySelector(".shipping-message-container");
      this.minFeeMessageContainer = this.querySelector(".min-fee-message-container");

      if (this.decoratorContainer) {
        const body = document.querySelector('body');
        body.insertBefore(this.decoratorContainer, body.firstChild);
      }

      this.textColorLabel = this.querySelector('fieldset.option-selector legend .selected-value')

      if(this.decoratorContainer) {
        this.decoratorCloseModal = this.decoratorContainer.querySelector('.close');
        this.decoratorCloseModal.addEventListener("click", this.closeDecorator.bind(this));
      }
      this.updateDropShippingInfo();

      this.updateAvailability();
      this.handleButtons();

      this.updateVariantMessages(false);

      this.addEventListener('change', this.handleVariantChange.bind(this));

      this.btnAddToCart.addEventListener(
          "click",
          this.addToCartClicked.bind(this)
      );

      this.inputs.forEach(input => {
        input.addEventListener('change', (event) => {
          this.validateMax(input)
        });
      });

      this.decorateOptions.forEach(input => {
        input.addEventListener('change', (event) => {
          const isCustomized = event.target.value === 'customized';
          this.decorateButton.classList.toggle('hide', !isCustomized);
          this.btnAddToCart.classList.toggle('hide', isCustomized);
        });
      });

      this.qtyPlusButtons.forEach(button => {
        button.addEventListener('click', () => {
          const associatedInput = button.parentElement.querySelector('input');
          const maxQty = parseInt(associatedInput.getAttribute('max'));
          if (parseInt(associatedInput.value) === maxQty) {
            const paragraphElement = this.qtyAlertContainer.querySelector('p');
            const currentContent = paragraphElement.innerHTML;
            paragraphElement.innerHTML = currentContent.replace('##QTY##', maxQty);
            this.qtyAlertContainer.classList.remove('hide');
            setTimeout(() => {
              this.qtyAlertContainer.classList.add('hide');
            }, 5000);
          }
        });
      });
      this.updateLabelText();
    }

    updateDropShippingInfo(){
      this.optionSelectors[0].querySelectorAll('input').forEach(input => {
        const optionValue = input.value;
        if(this.hasDropshipping(optionValue)){
          input.classList.add('dropshipping');
          const label = this.querySelector(`label[for="${input.id}"]`);
          if (label) {
            label.classList.add('dropshipping');
          }
        }
      })
    }

    hasDropshipping(optionValue) {
      const matchingProducts = Object.values(this.data.formatted).filter(product => {
        return product.option1 === optionValue;
      });

      return matchingProducts.some(product => product.dropshipping === "true");
    }

    /**
     * Handles 'change' events on the variant picker element.
     * @param {object} evt - Event object.
     */
    handleVariantChange(evt) {
      const selectedOptions = this.getSelectedOptions();
      this.variant = null;

      // Get selected variant data (if variant exists).
      this.variant = this.data.product.variants.find((v) =>
        v.options.every((val, index) => val === selectedOptions[index])
      );

      if (this.variant) {
        this.updateMedia();
        this.updateUrl(evt);
        this.updateVariantInput();
      }

      this.updateVariantMessages(this.variant);
      this.updateAddToCartButton();
      this.updateAvailability(evt);
      this.updatePrice();
      this.updateWeight();
      this.updateBarcode();
      this.updateBackorderText();
      this.updatePickupAvailability();
      this.updateSku();
      this.updateLabelText();

      this.dispatchEvent(new CustomEvent('on:variant:change', {
        bubbles: true,
        detail: {
          form: this.productForm,
          variant: this.variant,
          product: this.data.product
        }
      }));
    }

    /**
     * Updates the "Add to Cart" button label and disabled state.
     */
    /*updateAddToCartButton() {
      this.productForm = this.section.querySelector('.js-product-form-main');
      if (!this.productForm) return;

      this.addBtn = this.addBtn || this.productForm.querySelector('[name="add"]');
      const variantAvailable = this.variant && this.variant.available;
      const unavailableStr = this.variant ? theme.strings.noStock : theme.strings.noVariant;

      this.addBtn.disabled = !variantAvailable;
      this.addBtn.textContent = variantAvailable
        ? this.addBtn.dataset.addToCartText
        : unavailableStr;
    }
*/
    /**
     * Updates the availability status in option selectors.
     */
    updateAvailability(event) {
      if (this.dataset.showAvailability === 'false') return;
      let currVariant = this.variant;

      if (!this.variant) {
        currVariant = { options: this.getSelectedOptions() };
      }

      const updateOptionAvailability = (optionEl, available, soldout) => {
        const el = optionEl;
        const text = soldout ? theme.strings.noStock : theme.strings.noVariant;
        el.classList.toggle('is-unavailable', !available);

        if (optionEl.classList.contains('custom-select__option')) {
          const em = el.querySelector('em');

          if (em) {
            em.hidden = available;
          }

          if (!available) {
            if (em) {
              em.textContent = text;
            } else {
              el.innerHTML = `${el.innerHTML} <em class="pointer-events-none">${text}</em>`;
            }
          }
        } else if (!available) {
          el.nextElementSibling.title = text;
        } else {
          el.nextElementSibling.removeAttribute('title');
        }
      };

      // Flag selector options as available or sold out, depending on the variant availability
      this.optionSelectors.forEach((selector, selectorIndex) => {
        this.data.product.variants.forEach((variant) => {
          let matchCount = 0;

          variant.options.forEach((option, optionIndex) => {
            if (option === currVariant.options[optionIndex] && optionIndex !== selectorIndex) {
              matchCount += 1;
            }
          });

          if (matchCount === currVariant.options.length - 1) {
            const options = selector.querySelectorAll('.js-option');
            const optionEl = Array.from(options).find((opt) => {
              if (selector.dataset.selectorType === 'dropdown') {
                return opt.dataset.value === variant.options[selectorIndex];
              }
              return opt.value === variant.options[selectorIndex];
            });

          }
        });
      });

      if(event === undefined || event && !event.target.closest('fieldset').classList.contains('sizes-option')) {
        this.qtyOptionSelectors.forEach((selector, selectorIndex) => {
          const size = selector.dataset.size;
          const variantId = Object.keys(this.data.formatted).find(key => {
            const item = this.data.formatted[key];
            return item.option1 === currVariant.options[0] && item.option2 === size;
          });
          if (variantId) {
            const variantData = this.data.formatted[variantId];
            const variantQ = variantData.inventory_q;
            const qtyInput = selector.querySelector("input");
            qtyInput.setAttribute('max', variantQ)
            qtyInput.setAttribute('data-variant-id', variantId);
            qtyInput.value = 0;
            qtyInput.parentElement.querySelector('.btn--minus').click();
            if (variantQ <= 0) {
              selector.classList.add('out-of-stock');
            } else {
              selector.classList.remove('out-of-stock');
            }
          }
        });
      }

      this.handleButtons();

    }

    /**
     * Updates the backorder text and visibility.
     */
    updateBackorderText() {
      this.backorder = this.backorder || this.section.querySelector('.backorder');
      if (!this.backorder) return;

      let hideBackorder = true;

      if (this.variant && this.variant.available) {
        const { inventory } = this.data.formatted[this.variant.id];

        if (this.variant.inventory_management && inventory === 'none') {
          const backorderProdEl = this.backorder.querySelector('.backorder__product');
          const prodTitleEl = this.section.querySelector('.product-title');
          const variantTitle = this.variant.title.includes('Default')
            ? ''
            : ` - ${this.variant.title}`;

          backorderProdEl.textContent = `${prodTitleEl.textContent}${variantTitle}`;
          hideBackorder = false;
        }
      }

      this.backorder.hidden = hideBackorder;
    }

    /**
     * Updates the color option label text.
     * @param {object} evt - Event object
     */
    updateLabelText() {
      const fieldset = this.textColorLabel.closest('fieldset');
      const selectedColor = fieldset.querySelector('input:checked').value;
      this.textColorLabel.textContent = selectedColor;
    }

    /**
     * Updates the product media.
     */
    updateMedia() {
      if (!this.variant.featured_media) return;

      if (this.section.matches('quick-add-drawer')) {
        this.section.updateMedia(this.variant.featured_media.id);
      } else {
        this.mediaGallery = this.mediaGallery || this.section.querySelector('media-gallery');
        if (!this.mediaGallery) return;

        const variantMedia = this.mediaGallery.querySelector(
          `[data-media-id="${this.variant.featured_media.id}"]`
        );
        this.mediaGallery.setActiveMedia(variantMedia, true, true);
      }
    }

    /**
     * Updates the pick up availability.
     */
    updatePickupAvailability() {
      this.pickUpAvailability =
        this.pickUpAvailability || this.section.querySelector('pickup-availability');
      if (!this.pickUpAvailability) return;

      if (this.variant && this.variant.available) {
        this.pickUpAvailability.getAvailability(this.variant.id);
      } else {
        this.pickUpAvailability.removeAttribute('available');
        this.pickUpAvailability.innerHTML = '';
      }
    }

    /**
     * Updates the price.
     */
    updatePrice() {
      this.price = this.price || this.section.querySelector('.product-info__price > .price');
      if (!this.price) return;

      if (this.variant) {
        const priceCurrentEl = this.price.querySelector('.price__current');
        const priceWasEl = this.price.querySelector('.price__was');
        const unitPriceEl = this.price.querySelector('.unit-price');

        // Update current price and original price if on sale.
        priceCurrentEl.innerHTML = this.data.formatted[this.variant.id].price;
        if (priceWasEl)
          priceWasEl.innerHTML = this.data.formatted[this.variant.id].compareAtPrice || '';

        // Update unit price, if specified.
        if (this.variant.unit_price_measurement) {
          const valueEl = this.price.querySelector('.unit-price__price');
          const unitEl = this.price.querySelector('.unit-price__unit');
          const value = this.variant.unit_price_measurement.reference_value;
          const unit = this.variant.unit_price_measurement.reference_unit;

          valueEl.innerHTML = this.data.formatted[this.variant.id].unitPrice;
          unitEl.textContent = value === 1 ? unit : `${value} ${unit}`;
        }

        unitPriceEl.hidden = !this.variant.unit_price_measurement;
        this.price.classList.toggle(
          'price--on-sale',
          this.variant.compare_at_price > this.variant.price
        );
        this.price.classList.toggle('price--sold-out', !this.variant.available);
      }
/*
      this.price.querySelector('.price__default').hidden = !this.variant;
      this.price.querySelector('.price__no-variant').hidden = this.variant;

 */
    }

    /**
     * Updates the weight.
     */
    updateWeight() {
      this.weights = this.weights || this.section.querySelectorAll('.product-info__weight');
      if (this.weights.length === 0) return;

      const weightAvailable = this.variant && this.variant.weight > 0;
      this.weights.forEach((weight) => {
        weight.textContent = weightAvailable ? this.data.formatted[this.variant.id].weight : '';
        weight.hidden = !weightAvailable;
      });
    }

    /**
     * Updates the Barcode.
     */
    updateBarcode() {
      this.barcodes = this.barcodes || this.section.querySelectorAll('.product-info__barcode-value');
      if (this.barcodes.length === 0) return;

      const barcodeAvailable = this.variant && this.variant.barcode;
      this.barcodes.forEach((barcode) => {
        barcode.textContent = barcodeAvailable ? this.variant.barcode : '';
        barcode.parentNode.hidden = !barcodeAvailable;
      });
    }

    /**
     * Updates the SKU.
     */
    updateSku() {
      this.sku = this.sku || this.section.querySelector('.product-sku__value');
      if (!this.sku) return;

      const skuAvailable = this.variant && this.variant.sku;
      this.sku.textContent = skuAvailable ? this.variant.sku : '';
      this.sku.parentNode.hidden = !skuAvailable;
    }

    /**
     * Updates the url with the selected variant id.
     * @param {object} evt - Event object.
     */
    updateUrl(evt) {
      if (!evt || evt.type !== 'change' || this.dataset.updateUrl === 'false') return;
      window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.variant.id}`);
    }

    /**
     * Updates the value of the hidden [name="id"] form inputs.
     */
    updateVariantInput() {
      this.forms =
        this.forms || this.section.querySelectorAll('.js-product-form-main, .js-instalments-form');

      this.forms.forEach((form) => {
        const input = form.querySelector('input[name="id"]');
        input.value = this.variant.id;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    /**
     * Gets the selected option element from each selector.
     * @returns {Array}
     */
    getSelectedOptions() {
      const selectedOptions = [];

      this.optionSelectors.forEach((selector) => {
        if (selector.dataset.selectorType === 'dropdown') {
          selectedOptions.push(selector.querySelector('.custom-select__btn').textContent.trim());
        } else {
          selectedOptions.push(selector.querySelector('input:checked').value);
        }
      });

      selectedOptions.push(document.querySelector('.decorator-option-selector.sizes-option input').dataset.value)

      return selectedOptions;
    }

    /**
     * Gets the product data.
     * @returns {?object}
     */
    getProductData() {
      const dataEl = this.querySelector('[type="application/json"]');
      return JSON.parse(dataEl.textContent);
    }

    handleButtons(){
        const totQ = Array.from(this.inputs).reduce((total, input) => {
          const qty = parseInt(input.value, 10);
          return isNaN(qty) ? total : total + qty;
        }, 0);
        this.btnAddToCart.disabled = this.decorateButton.disabled = totQ === 0;
    }

    validateMax(input) {
      const enteredValue = parseInt(input.value);
      const maxAllowed = parseInt(input.getAttribute('max'));

      if (enteredValue > maxAllowed) {
        input.value = maxAllowed;
      }
    }

    createItemsArray() {
      const items = [];
      for (let i = 0; i < this.inputs.length; i++) {
        const input = this.inputs[i];
        if (input.value && input.value > 0) {
          const id = input.dataset.variantId;
          const quantity = input.value;
          items.push({ id, quantity });
        }
      }
      return items;
    }

    addToCartClicked() {
      this.addToCart();
    }

    async addToCart(){
      const items = this.createItemsArray();
      if(items.length > 0) {
        await fetch(window.Shopify.routes.root + "cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({items: items}),
        })
            .then((response) => {
              document.dispatchEvent(
                  new CustomEvent("dispatch:cart-drawer:refresh", {
                    bubbles: true,
                  })
              );
              document.dispatchEvent(
                  new CustomEvent("dispatch:cart-drawer:open", {
                    bubbles: true,
                  })
              );
              return response.json();
            })
            .catch((error) => {
              console.error("Error:", error);
              return error;
            });
      }
    }

    decorateAction(event){
      const baseURL = this.decoratorIframe.dataset.baseUrl;
      const iframeURL = this.decoratorIframe.getAttribute('src');
      const finalURL = baseURL + this.generateURLParamenters();
      if(finalURL !== iframeURL){
        this.decoratorIframe.setAttribute('src', finalURL);
      }
      this.decoratorContainer.classList.add('show');
    }

    generateURLParamenters(){
      let parameters = '';
      let index = 1;
      this.inputs.forEach((input) => {
        const variantID = input.getAttribute('data-variant-id');
        const inputValue = input.value;
        if (inputValue !== '0') {
          parameters += `?variant_${index}=${variantID}&variant_qty_${index}=${inputValue}`;
          index++;
        }
      });

      return parameters;
    }

    closeDecorator(){
      this.decoratorContainer.classList.remove('show');
    }

    getSelectedVariantId(){
      const selectedOptions = this.getSelectedOptions();
      var variant = null;

      // Get selected variant data (if variant exists).
      variant = this.data.product.variants.find((v) =>
          v.options.every((val, index) => val === selectedOptions[index])
      );

      return variant;
    }

    createEmptyMessages(){
      return {
        warehouse_stocked: false,
        warehouse_stocked_shipping_message: "",
        dropship_shipping_message: "",
        min_fee_message: "",
        inventory_policy: "deny",
        inventory_q: 0
      };
    }

    getSelectedVariantDetails(variantParam) {
      var variant;
      if(variantParam === false){
        variant = this.getSelectedVariantId();
      }else{
        variant = variantParam;
      }
      if(variant == null){
        return this.createEmptyMessages();
      }

      var script = this.querySelector('script[type="application/json"]');
      var jsonData;
      try {
        jsonData = JSON.parse(script.textContent);
      } catch (e) {
        console.error("Error parsing JSON: ", e);
        return;
      }

      var formatted = jsonData.formatted;
      if (!formatted) {
        console.error("'formatted' not present.");
        return;
      }

      var variantId = variant.id;
      if (formatted.hasOwnProperty(variantId)) {
        return {
          warehouse_stocked: formatted[variantId].warehouse_stocked,
          warehouse_stocked_shipping_message: formatted[variantId].warehouse_stocked_shipping_message,
          dropship_shipping_message: formatted[variantId].dropship_shipping_message,
          min_fee_message: formatted[variantId].min_fee_message,
          inventory_policy: formatted[variantId].inventory_policy,
          inventory_q: formatted[variantId].inventory_q
        };
      } else {
        console.error("Variant not Present: " + variantId);
        this.createEmptyMessages();
      }
    }

    updateVariantMessages(variantParam) {
      let variantDetails = this.getSelectedVariantDetails(variantParam);
      if(variantDetails.inventory_policy === 'deny' && variantDetails.inventory_q <= 0){
        variantDetails.warehouse_stocked_shipping_message = "";
        variantDetails.dropship_shipping_message = "";
        variantDetails.min_fee_message = "";
      }
      this.updateShippingMessage(variantDetails);
      this.updateFeeMessage(variantDetails);
    }

    updateShippingMessage(variantDetails){
      var dropshipShippingMessage;
      const selectedOption = this.querySelector('input[name="decorator-option"]:checked').value;

      if(variantDetails.warehouse_stocked === "true"){
        dropshipShippingMessage = this.shippingMessageContainer.dataset.defaultWarehouseMessage;
        if(variantDetails.warehouse_stocked_shipping_message !== ""){
          dropshipShippingMessage = variantDetails.warehouse_stocked_shipping_message;
        }
        if (selectedOption === 'customized') {
          dropshipShippingMessage = this.shippingMessageContainer.dataset.decoratedShippingMessage;
        }
        this.shippingMessageContainer.innerHTML = dropshipShippingMessage;
      }else{
        dropshipShippingMessage = this.shippingMessageContainer.dataset.defaultDropshippingMessage;
        if(variantDetails.dropship_shipping_message !== ""){
          dropshipShippingMessage = variantDetails.dropship_shipping_message;
        }
        if (selectedOption === 'customized') {
          dropshipShippingMessage = this.shippingMessageContainer.dataset.decoratedShippingMessage;
        }
        this.shippingMessageContainer.innerHTML = dropshipShippingMessage;
      }
    }

    updateFeeMessage(variantDetails){
      var feeMessage = "";
      if(variantDetails.warehouse_stocked !== "true"){
        feeMessage = this.minFeeMessageContainer.dataset.defaultMinFeeMessage;
        if(variantDetails.min_fee_message !== ""){
          feeMessage = variantDetails.min_fee_message;
        }
      }
      this.minFeeMessageContainer.innerHTML = feeMessage;
    }


  }

  customElements.define('variant-picker', VariantPicker);
}
