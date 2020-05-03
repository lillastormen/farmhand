import React from 'react'
import { shallow } from 'enzyme'

import { generateCow } from './utils'
import {
  sampleItem1,
  sampleItem2,
  sampleFieldTool1,
  sampleCropSeedsItem1,
} from './data/items'
import { testCrop, testItem } from './test-utils'
import {
  INITIAL_FIELD_WIDTH,
  INITIAL_FIELD_HEIGHT,
  MAX_ANIMAL_NAME_LENGTH,
  COW_HUG_BENEFIT,
  PURCHASEABLE_COW_PENS,
} from './constants'
import { COW_PEN_PURCHASED, RECIPE_LEARNED } from './templates'
import { PROGRESS_SAVED_MESSAGE } from './strings'
import { fieldMode, stageFocusType } from './enums'
import { recipesMap } from './data/maps'
import Farmhand, {
  computePlayerInventory,
  getFieldToolInventory,
  getPlantableCropInventory,
} from './Farmhand'

jest.mock('localforage')
jest.mock('./data/maps')
jest.mock('./data/items')

jest.mock('./constants', () => ({
  __esModule: true,
  ...jest.requireActual('./constants'),
  COW_HUG_BENEFIT: 0.5,
  CROW_CHANCE: 0,
  INITIAL_FIELD_HEIGHT: 4,
  INITIAL_FIELD_WIDTH: 4,
  RAIN_CHANCE: 0,
}))

const { objectContaining } = expect

let component

const stubLocalforage = () => {
  const localforage = jest.requireMock('localforage')
  localforage.createInstance = () => ({
    getItem: () => Promise.resolve(null),
    setItem: (key, data) => Promise.resolve(data),
  })
}

beforeEach(() => {
  stubLocalforage()
  component = shallow(<Farmhand />)
})

describe('private helpers', () => {
  describe('computePlayerInventory', () => {
    let playerInventory
    let inventory
    let valueAdjustments

    beforeEach(() => {
      inventory = [{ quantity: 1, id: 'sample-item-1' }]
      valueAdjustments = {}
      playerInventory = computePlayerInventory(inventory, valueAdjustments)
    })

    test('maps inventory state to renderable inventory data', () => {
      expect(playerInventory).toEqual([{ quantity: 1, ...sampleItem1 }])
    })

    test('returns cached result with unchanged input', () => {
      const newPlayerInventory = computePlayerInventory(
        inventory,
        valueAdjustments
      )
      expect(playerInventory).toEqual(newPlayerInventory)
    })

    test('invalidates cache with changed input', () => {
      playerInventory = computePlayerInventory(
        [{ quantity: 1, id: 'sample-item-2' }],
        valueAdjustments
      )
      expect(playerInventory).toEqual([{ ...sampleItem2, quantity: 1 }])
    })

    describe('with valueAdjustments', () => {
      beforeEach(() => {
        valueAdjustments = {
          'sample-item-1': 2,
        }

        playerInventory = computePlayerInventory(inventory, valueAdjustments)
      })

      test('maps inventory state to renderable inventory data', () => {
        expect(playerInventory).toEqual([
          { ...sampleItem1, quantity: 1, value: 2 },
        ])
      })
    })
  })

  describe('getFieldToolInventory', () => {
    let fieldToolInventory

    beforeEach(() => {
      fieldToolInventory = getFieldToolInventory([
        sampleFieldTool1,
        sampleCropSeedsItem1,
      ])
    })

    test('filters out non-field tool items', () => {
      expect(fieldToolInventory).toEqual([sampleFieldTool1])
    })
  })

  describe('getPlantableCropInventory', () => {
    let plantableCropInventory
    let inventory

    beforeEach(() => {
      inventory = [{ id: 'sample-crop-seeds-1' }, { id: 'sample-item-1' }]
      plantableCropInventory = getPlantableCropInventory(inventory)
    })

    test('filters out non-plantable items', () => {
      expect(plantableCropInventory).toEqual([sampleCropSeedsItem1])
    })
  })
})

describe('state', () => {
  test('inits field', () => {
    expect(component.state().field).toHaveLength(INITIAL_FIELD_HEIGHT)
    expect(component.state().field[0]).toHaveLength(INITIAL_FIELD_WIDTH)
  })

  test('changing to state.stageFocus === stageFocusType.COW_PEN resets selectedCowId', () => {
    component.setState({
      selectedCowId: 'foo',
      stageFocus: stageFocusType.FIELD,
    })

    component.setState({ stageFocus: stageFocusType.COW_PEN })

    expect(component.state().selectedCowId).toEqual('')
  })
})

describe('getters', () => {
  describe('hoveredPlotRange', () => {
    beforeEach(() => {
      component.setState({
        hoveredPlot: { x: 0, y: 0 },
      })
    })

    describe('fieldMode === SET_SPRINKLER', () => {
      beforeEach(() => {
        component.setState({
          fieldMode: fieldMode.SET_SPRINKLER,
          hoveredPlotRangeSize: 1,
        })
      })

      describe('plot is empty', () => {
        beforeEach(() => {
          component.setState({
            field: [[null]],
          })
        })

        test('gets hovered crop range', () => {
          const { hoveredPlotRange } = component.instance()
          expect(hoveredPlotRange).toEqual([
            [
              { x: -1, y: -1 },
              { x: 0, y: -1 },
              { x: 1, y: -1 },
            ],
            [
              { x: -1, y: 0 },
              { x: 0, y: 0 },
              { x: 1, y: 0 },
            ],
            [
              { x: -1, y: 1 },
              { x: 0, y: 1 },
              { x: 1, y: 1 },
            ],
          ])
        })
      })

      describe('plot is not empty', () => {
        beforeEach(() => {
          component.setState({
            field: [[testCrop()]],
          })
        })

        test('gets only the hovered crop', () => {
          const { hoveredPlotRange } = component.instance()
          expect(hoveredPlotRange).toEqual([[{ x: 0, y: 0 }]])
        })
      })
    })

    describe('fieldMode !== SET_SPRINKLER', () => {
      test('gets only the hovered crop', () => {
        const { hoveredPlotRange } = component.instance()
        expect(hoveredPlotRange).toEqual([[{ x: 0, y: 0 }]])
      })
    })
  })

  describe('playerInventoryQuantities', () => {
    test('computes a map of item IDs to their quantity in the inventory', () => {
      component.setState({
        inventory: [
          testItem({ id: 'sample-item-1', quantity: 1 }),
          testItem({ id: 'sample-item-2', quantity: 2 }),
        ],
      })

      expect(component.instance().playerInventoryQuantities).toEqual(
        objectContaining({
          'sample-item-1': 1,
          'sample-item-2': 2,
          'sample-item-3': 0,
        })
      )
    })
  })
})

describe('instance methods', () => {
  describe('componentDidMount', () => {
    beforeEach(() => {
      jest.spyOn(component.instance(), 'incrementDay')
    })

    describe('fresh boot', () => {
      beforeEach(() => {
        component.instance().componentDidMount()
      })

      test('increments the day by one', () => {
        expect(component.instance().incrementDay).toHaveBeenCalled()
      })
    })

    describe('boot from persisted state', () => {
      beforeEach(() => {
        const localforage = jest.requireMock('localforage')
        localforage.createInstance = () => ({
          getItem: () =>
            Promise.resolve({
              foo: 'bar',
              newDayNotifications: ['baz'],
            }),
          setItem: data => Promise.resolve(data),
        })

        component = shallow(<Farmhand />)

        jest.spyOn(component.instance(), 'incrementDay')
        jest.spyOn(component.instance(), 'showNotification')

        component.instance().componentDidMount()
      })

      test('rehydrates from persisted state', () => {
        expect(component.instance().incrementDay).not.toHaveBeenCalled()
        expect(component.state().foo).toBe('bar')
      })

      test('shows notifications for pending newDayNotifications', () => {
        expect(component.instance().showNotification).toHaveBeenCalledWith(
          'baz'
        )
      })

      test('empties newDayNotifications', () => {
        expect(component.state().newDayNotifications).toHaveLength(0)
      })
    })
  })

  describe('showCowPenPurchasedNotifications', () => {
    describe('cow pen purchasing', () => {
      test('does show notification', () => {
        component.setState({ purchasedCowPen: 1 })
        component
          .instance()
          .showCowPenPurchasedNotifications({ purchasedCowPen: 0 })

        expect(component.state().notifications).toContain(
          COW_PEN_PURCHASED`${PURCHASEABLE_COW_PENS.get(1).cows}`
        )
      })
    })
  })

  describe('showRecipeLearnedNotifications', () => {
    describe('no new recipes were learned', () => {
      test('does not show notification', () => {
        component.setState({ learnedRecipes: {} })
        component
          .instance()
          .showRecipeLearnedNotifications({ learnedRecipes: {} })

        expect(component.state().notifications).not.toContain(
          RECIPE_LEARNED`${recipesMap['sample-recipe-1']}`
        )
      })
    })

    describe('new recipe was learned', () => {
      test('does show notification', () => {
        component.setState({ learnedRecipes: { 'sample-recipe-1': true } })
        component
          .instance()
          .showRecipeLearnedNotifications({ learnedRecipes: {} })

        expect(component.state().notifications).toContain(
          RECIPE_LEARNED`${recipesMap['sample-recipe-1']}`
        )
      })
    })
  })

  describe('incrementDay', () => {
    beforeEach(() => {
      jest.spyOn(component.instance().localforage, 'setItem')
      jest.spyOn(component.instance(), 'showNotification')

      component.setState({ newDayNotifications: ['foo'] })
      component.instance().incrementDay()
    })

    test('empties out newDayNotifications', () => {
      expect(component.state().newDayNotifications).toHaveLength(0)
    })

    test('persists app state with pending newDayNotifications', () => {
      expect(component.instance().localforage.setItem).toHaveBeenCalledWith(
        'state',
        Farmhand.reduceByPersistedKeys({
          ...component.state(),
          newDayNotifications: ['foo'],
        })
      )
    })

    test('makes pending notification', () => {
      const { showNotification } = component.instance()
      expect(showNotification).toHaveBeenCalledTimes(2)
      expect(showNotification).toHaveBeenNthCalledWith(
        1,
        PROGRESS_SAVED_MESSAGE
      )
      expect(showNotification).toHaveBeenNthCalledWith(2, 'foo')
    })
  })

  describe('focusNextView', () => {
    test('goes to next view', () => {
      const { viewList } = component.instance()
      component.setState({ stageFocus: viewList[0] })
      component.instance().focusNextView()
      expect(component.state().stageFocus).toEqual(viewList[1])
    })

    test('cycles to the beginning', () => {
      const { viewList } = component.instance()
      component.setState({ stageFocus: viewList[viewList.length - 1] })
      component.instance().focusNextView()
      expect(component.state().stageFocus).toEqual(viewList[0])
    })
  })

  describe('focusPreviousView', () => {
    test('goes to previous view', () => {
      const { viewList } = component.instance()
      component.setState({ stageFocus: viewList[1] })
      component.instance().focusPreviousView()
      expect(component.state().stageFocus).toEqual(viewList[0])
    })

    test('cycles to the end', () => {
      const { viewList } = component.instance()
      component.setState({ stageFocus: viewList[0] })
      component.instance().focusPreviousView()
      expect(component.state().stageFocus).toEqual(
        viewList[viewList.length - 1]
      )
    })
  })

  describe('purchaseItemMax', () => {
    describe('player does not have enough money for any items', () => {
      beforeEach(() => {
        component.setState({
          money: 1,
          valueAdjustments: { 'sample-item-1': 1e9 },
        })
        component.instance().purchaseItemMax(testItem({ id: 'sample-item-1' }))
      })

      test('items are not purchased', () => {
        expect(component.state('money')).toEqual(1)
        expect(component.state('inventory')).toEqual([])
      })
    })

    describe('player has enough money for items', () => {
      beforeEach(() => {
        component.setState({
          money: 2.5,
          valueAdjustments: { 'sample-item-1': 1 },
        })
        component.instance().purchaseItemMax(testItem({ id: 'sample-item-1' }))
      })

      test('max items are purchased', () => {
        expect(component.state('money')).toEqual(0.5)
        expect(component.state('inventory')[0].quantity).toEqual(2)
      })
    })
  })

  describe('sellAllOfItem', () => {
    beforeEach(() => {
      component.setState({
        inventory: [testItem({ id: 'sample-item-1', quantity: 2 })],
        money: 100,
        valueAdjustments: { 'sample-item-1': 1 },
      })

      component.instance().sellAllOfItem(testItem({ id: 'sample-item-1' }))
    })

    test('removes items from inventory', () => {
      expect(component.state().inventory).toEqual([])
    })

    test('adds total value of items to player money', () => {
      expect(component.state().money).toEqual(102)
    })
  })

  describe('changeCowName', () => {
    test('updates cow name', () => {
      const cow = generateCow()

      component.setState({
        cowInventory: [generateCow(), cow],
      })

      component.instance().changeCowName(cow.id, 'new name')

      expect(component.state().cowInventory[1]).toEqual({
        ...cow,
        name: 'new name',
      })
    })

    test('restricts name length', () => {
      const cow = generateCow()

      component.setState({
        cowInventory: [cow],
      })

      component.instance().changeCowName(cow.id, new Array(100).join('.'))

      expect(component.state().cowInventory[0].name).toHaveLength(
        MAX_ANIMAL_NAME_LENGTH
      )
    })
  })

  describe('hugCow', () => {
    describe('cow has not hit daily hug benefit limit', () => {
      test('increases cow happiness', () => {
        const cow = generateCow()

        component.setState({
          cowInventory: [cow],
        })

        component.instance().hugCow(cow.id)

        const [
          { happiness, happinessBoostsToday },
        ] = component.state().cowInventory
        expect(happiness).toBe(COW_HUG_BENEFIT)
        expect(happinessBoostsToday).toBe(1)
      })

      describe('cow is at max happiness', () => {
        test('does not increase cow happiness', () => {
          const cow = generateCow({ happiness: 1 })

          component.setState({
            cowInventory: [cow],
          })

          component.instance().hugCow(cow.id)
          expect(component.state().cowInventory[0].happiness).toBe(1)
        })
      })
    })

    describe('cow has hit daily hug benefit limit', () => {
      test('does not increase cow happiness', () => {
        const cow = generateCow({ happiness: 0.5, happinessBoostsToday: 3 })

        component.setState({
          cowInventory: [cow],
        })

        component.instance().hugCow(cow.id)

        const [
          { happiness, happinessBoostsToday },
        ] = component.state().cowInventory
        expect(happiness).toBe(0.5)
        expect(happinessBoostsToday).toBe(3)
      })
    })
  })

  describe('waterAllPlots', () => {
    beforeEach(() => {
      component.setState({
        field: [
          [
            testCrop({ itemId: 'sample-crop-1' }),
            testCrop({ itemId: 'sample-crop-2' }),
          ],
          [testCrop({ itemId: 'sample-crop-3' })],
        ],
      })

      component.instance().waterAllPlots()
    })

    test('sets wasWateredToday to true for all plots', () => {
      expect(component.state().field[0][0].wasWateredToday).toBe(true)
      expect(component.state().field[0][1].wasWateredToday).toBe(true)
      expect(component.state().field[1][0].wasWateredToday).toBe(true)
    })
  })

  describe('selectCow', () => {
    test('updates selectedCowId', () => {
      component.instance().selectCow({ id: 'abc' })
      expect(component.state().selectedCowId).toEqual('abc')
    })
  })
})
