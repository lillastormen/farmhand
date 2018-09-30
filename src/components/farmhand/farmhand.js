import React, { Component, createRef } from 'react';
import NotificationSystem from 'react-notification-system';
import memoize from 'fast-memoize';
import eventHandlers from '../../event-handlers';
import Navigation from '../Navigation';
import ContextPane from '../ContextPane';
import Stage from '../Stage';
import { getItemValue } from '../../utils';
import shopInventory from '../../data/shop-inventory';
import { itemsMap } from '../../data/maps';
import { stageFocusType } from '../../enums';
import { initialFieldWidth, initialFieldHeight } from '../../constants';

import './Farmhand.css';

/**
 * @param {Array.<{ item: farmhand.item, quantity: number }>} inventory
 * @param {Object.<number>} valueAdjustments
 * @returns {Array.<farmhand.item>}
 */
export const computePlayerInventory = memoize((inventory, valueAdjustments) =>
  inventory.map(({ quantity, id }) => ({
    quantity,
    ...itemsMap[id],
    value: getItemValue(itemsMap[id], valueAdjustments),
  }))
);

export const getUpdatedValueAdjustments = () =>
  Object.keys(itemsMap).reduce(
    (acc, key) => ({
      [key]: Math.random() + 0.5,
      ...acc,
    }),
    {}
  );

/**
 * @typedef farmhand.state
 * @type {Object}
 * @property {number} dayCount
 * @property {Array.<Array.<farmhand.crop|null>>} field
 * @property {Array.<{ item: farmhand.item, quantity: number }>} inventory
 * @property {number} money
 * @property {Array.<farmhand.item>} shopInventory
 * @property {farmhand.module:enums.stageFocusType} stageFocus
 * @property {Object.<number>} valueAdjustments
 */

export default class Farmhand extends Component {
  constructor() {
    super(...arguments);

    /**
     * @member farmhand.Farmhand#state
     * @type {farmhand.state}
     */
    this.state = {
      dayCount: 0,
      field: this.createNewField(),
      inventory: [],
      money: 500,
      shopInventory: [...shopInventory],
      stageFocus: stageFocusType.NONE,
      valueAdjustments: {},
    };

    this.notificationSystemRef = createRef();
    const handlers = (this.handlers = {});

    // Bind event handlers
    Object.keys(eventHandlers).forEach(
      method => (handlers[method] = eventHandlers[method].bind(this))
    );
  }

  componentDidMount() {
    this.proceedDay();
  }

  createNewField() {
    return new Array(initialFieldHeight)
      .fill(undefined)
      .map(() => new Array(initialFieldWidth).fill(null));
  }

  /**
   * @param {Object} options
   * @see
   * {@link https://github.com/igorprado/react-notification-system#creating-a-notification}
   * for available options.
   */
  triggerNotification(options) {
    this.notificationSystemRef.current.addNotification({
      level: 'info',
      ...options,
    });
  }

  proceedDay() {
    const { dayCount } = this.state;

    this.setState({
      dayCount: dayCount + 1,
      valueAdjustments: getUpdatedValueAdjustments(),
    });
  }

  getPlayerInventory() {
    const { inventory, valueAdjustments } = this.state;
    return computePlayerInventory(inventory, valueAdjustments);
  }

  render() {
    const { handlers, notificationSystemRef, state } = this;

    return (
      <div className="fill Farmhand">
        <NotificationSystem ref={notificationSystemRef} />
        <div className="sidebar">
          <Navigation {...{ ...handlers, ...state }} />
          <ContextPane />
        </div>
        <Stage
          {...{
            inventory: this.getPlayerInventory(),
            ...handlers,
            ...state,
          }}
        />
      </div>
    );
  }
}
