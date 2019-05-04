import React from 'react';
import { FieldTools } from './FieldTools';
import Item from '../Item';
import { shallow } from 'enzyme';

let component;

beforeEach(() => {
  component = shallow(
    <FieldTools
      {...{
        handleItemSelect: () => {},
        fieldToolInventory: [{ quantity: 1, id: 'sample-field-tool-1' }],
        selectedItemId: 'sample-field-tool-1',
      }}
    />
  );
});

describe('rendering', () => {
  test('renders items for provided inventory', () => {
    expect(component.find(Item)).toHaveLength(1);
  });

  test('renders selected item gameState', () => {
    expect(component.find(Item).props().isSelected).toBeTruthy();
  });
});
