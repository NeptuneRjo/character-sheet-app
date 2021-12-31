/* eslint-disable no-case-declarations */
import Tabs from './Tabs.js';
import Weapon from '../models/Weapon.js';

class SheetView {
    /**
     * @param {EventEmitter} emitter
     */
    constructor (emitter) {
        this.emitter = emitter;
    }
    /**
     * @param {Character5e}
     */
    set character (character) {
        this.cur_character = character;
        // render character.
        this.renderCharacter();
    }
    /**
     * @returns {Character5e}
     */
    get character () {
        return this.cur_character;
    }
    /**
     * Change the main tab pane.
     * @param {String} targetPane
     */
    switchToPane (targetPane) {
        this.mainTabs.switchToPane(targetPane);
    }
    /**
     * Take character data and fill it into the page
     */
    renderCharacter () {
        if (this.cur_character === null) {
            return;
        }

        document.querySelector('[data-name="charname"]').content = this.cur_character.charname;

        const fields = Array.from(this.el.querySelectorAll('*[data-name]'));
        fields.forEach((el) => {
            const f = el.getAttribute('data-name');
            if (typeof this.cur_character[f] === 'undefined') {
                return;
            }
            const subf = el.getAttribute('data-subfield');
            const charValue = (subf) ? this.cur_character[f][subf] : this.cur_character[f];
            switch (el.tagName) {
                case 'INPUT':
                    // Make sure numbers default to 0.
                    // this is especially relevant for spell slots.
                    if (el.getAttribute('type') === 'number') {
                        el.value = charValue || 0;
                    } else {
                        el.value = charValue || '';
                    }
                    // For spell slot input we need to trigger the display or not of spells
                    const event = new Event('change');
                    el.dispatchEvent(event);
                    break;
                case 'SIMPLE-LIST':
                    el.clear();
                    const listItems = charValue || [];
                    if (listItems.length > 0) {
                        listItems.forEach((item) => {
                            if (item.length === 0) {
                                return;
                            }
                            el.addItem(item);
                        });
                    }
                    el.addItem();
                    break;
                case 'NOTE-LIST':
                    el.clear();
                    const noteItems = charValue || [];
                    if (noteItems.length > 0) {
                        noteItems.forEach((item) => {
                            if (item.length === 0) {
                                return;
                            }
                            el.addItem(item);
                        });
                    }
                    el.addItem();
                    break;
                case 'TABLE-EDITABLE':
                    el.clear();
                    const rowItems = charValue || [];
                    if (rowItems.length > 0) {
                        rowItems.forEach((item) => {
                            if (item.length === 0) {
                                return;
                            }
                            el.addRow(item);
                        });
                    }
                    el.addRow();
                    break;
                case 'SKILL-LISTING':
                    el.skillValue = charValue || 0;
                    el.skillMod = this.cur_character.getSkillMod(subf);
                    break;
                case 'ATTR-LISTING':
                    el.attributeScore = charValue || 10;
                    el.attributeMod = this.cur_character.attributeMod(f);
                    el.saveProficiency = this.cur_character.saves[f];
                    el.saveMod = this.cur_character.saveMod(f);
                    break;

                case 'FIELD-EDITABLE':
                    el.content = charValue || '';
                    break;
            }
        });

        this.el.querySelector('[data-name="proficiency"]').innerHTML = this.cur_character.proficiency;

        this.emitter.trigger('dialog:save:hide');
    }
    /**
     * Update a skill's modifier in the UI.
     * @param {String} skill
     * @param {String} modifier
     */
    updateSkillMod (skill, modifier) {
        const el = this.el.querySelector(`skill-listing[data-subfield="${skill}"]`);
        if (!el) {
            return;
        }
        el.skillMod = modifier;
    }
    /**
     * Update the proficiency modifier in the UI.
     */
    updateProficiency () {
        const proficiency = this.cur_character.proficiency;
        this.el.querySelector('[data-name="proficiency"]').innerHTML = proficiency;

        Array.from(this.el.querySelectorAll('skill-listing')).forEach((el) => {
            const skill = el.skillName;
            el.skillMod = this.cur_character.getSkillMod(skill);
        });

        Array.from(this.el.querySelectorAll('attr-listing')).forEach((el) => {
            const attr = el.attributeName;
            el.saveMod = this.cur_character.saveMod(attr);
        });
    }
    /**
     * Update an attribute's modifier in the UI.
     * @param {String} attribute
     */
    updateAttributeMods (attribute) {
        const el = this.el.querySelector(`attr-listing[data-name=${attribute}]`);
        if (!el) {
            return;
        }
        el.attributeMod = this.cur_character.attributeMod(attribute);
        el.saveMod = this.cur_character.saveMod(attribute);
    }
    /**
     * Update a save modifier in the UI.
     * @param {String} attribute
     */
    updateSaveMods (attribute) {
        const el = this.el.querySelector(`attr-listing[data-name=${attribute}]`);
        if (!el) {
            return;
        }
        el.saveMod = this.cur_character.saveMod(attribute);
    }
    /**
     * Handle input[name=number] changes.
     * @param {Event} ev
     */
    numberInputChange (ev) {
        const field = ev.target.dataset.name;
        const subfield = ev.target.dataset.subfield;
        if (typeof this.cur_character[field][subfield] === 'undefined') {
            return;
        }
        const newValue = parseInt(ev.target.value, 10);
        this.cur_character[field][subfield] = newValue;
        this.emitter.trigger('dialog:save:show');
        if (field === 'spell_slots') {
            const spellList = this.el.querySelector(`[data-name="spells"][data-subfield="${subfield}"]`);
            if (!newValue) {
                // this covers 0 and NaN
                spellList.parentNode.hidden = true;
            } else {
                spellList.parentNode.hidden = false;
            }
        }
    }
    /**
     * Trigger the event to show there are unsaved changes.
     */
    showUnsavedDialog () {
        this.emitter.trigger('dialog:save:show');
    }
    /**
     * Compare two properties to see if they are different
     * For objects/arrays we need to account for them being different objects
     * that have the same properties and values.
     * @param {String|Number|Array|Object|Boolean} valold Existing property value
     * @param {String|Number|Array|Object|Boolean} valnew New property value
     * @return {Boolean}
     */
    sameValues (valold, valnew) {
        // for efficiency we could do typeof checks
        // and only use JSON for objects...
        return JSON.stringify(valold) === JSON.stringify(valnew);
    }
    /**
     * When a field is changed in the UI.
     * Update the character and trigger save dialog
     * Only if the value is actually different.
     * @param {CustomEvent} ev
     */
    handleFieldChange (ev) {
        const field = ev.detail.field || '';
        const subfield = ev.detail.subfield || '';
        if (!field) {
            return;
        }
        const cur_character = this.cur_character;
        if (typeof cur_character[field] === 'undefined') {
            return;
        }
        let newValue = ev.detail.value;
        if (field === 'skills') {
            const currentVal = cur_character.getSkill(subfield);
            if (!this.sameValues(currentVal, newValue)) {
                cur_character.setSkill(subfield, ev.detail.value);
                this.showUnsavedDialog();
            }
            return;
        }
        if (subfield) {
            if (typeof cur_character[field] !== 'object' || Array.isArray(cur_character[field])) {
                return;
            }
            const currentVal = cur_character[field][subfield];
            if (!this.sameValues(currentVal, newValue)) {
                cur_character[field][subfield] = ev.detail.value;
                this.showUnsavedDialog();
            }
            return;
        }
        const currentVal = cur_character[field];
        if (field === 'weapons') {
            newValue = newValue.map((object) => {
                return new Weapon(object);
            });
        }
        if (!this.sameValues(currentVal, newValue)) {
            cur_character[field] = newValue;
            this.showUnsavedDialog();
        }
    }
    /**
     * When an attribute is changed in the UI.
     * @param {CustomEvent} ev
     */
    handleAttributeChange (ev) {
        const field = ev.detail.field || '';
        if (!field) {
            return;
        }
        this.cur_character.setAttribute(field, ev.detail.value);
        this.showUnsavedDialog();
    }
    /**
     * When a save is (un)checked in the UI.
     * @param {CustomEvent} ev
     */
    handleSaveChange (ev) {
        const field = ev.detail.field || '';
        if (!field) {
            return;
        }
        this.cur_character.setSaveProficiency(field, ev.detail.value);
        this.showUnsavedDialog();
    }
    /**
     * Initialize the view.
     */
    initialize () {
        this.el = document.querySelector('main');
        this.mainTabs = new Tabs(this.el.querySelector('ul[role=tablist]'));
        Array.from(this.el.querySelectorAll('input[type=number]')).forEach((el) => {
            el.addEventListener('change', this.numberInputChange.bind(this));
        });
        // Listen for events emitted from the components
        this.el.addEventListener('fieldChange', this.handleFieldChange.bind(this));
        this.el.addEventListener('attributeChange', this.handleAttributeChange.bind(this));
        this.el.addEventListener('saveChange', this.handleSaveChange.bind(this));

        this.emitter.on('character:skill:update', this.updateSkillMod, this);
        this.emitter.on('character:proficiency:update', this.updateProficiency, this);
        this.emitter.on('character:attribute:update', this.updateAttributeMods, this);
        this.emitter.on('character:save:update', this.updateSaveMods, this);
        this.emitter.on('tab:switch', this.switchToPane, this);
    }
}

export default SheetView;
