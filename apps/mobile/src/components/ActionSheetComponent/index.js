import React, {useEffect, useState} from 'react';
import {
  Dimensions,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import FastStorage from 'react-native-fast-storage';
import Icon from 'react-native-vector-icons/Feather';
import {db, DDS} from '../../../App';
import {
  ACCENT,
  COLOR_SCHEME,
  COLOR_SCHEME_DARK,
  COLOR_SCHEME_LIGHT,
  opacity,
  pv,
  setColorScheme,
  SIZE,
  WEIGHT,
} from '../../common/common';
import {useTracked} from '../../provider';
import {ACTIONS} from '../../provider/actions';
import {moveNoteEvent} from '../DialogManager';
import Share from 'react-native-share';
const w = Dimensions.get('window').width;
const h = Dimensions.get('window').height;

let tagsInputRef;
export const ActionSheetComponent = ({
  close = () => {},
  item,
  hasColors = false,
  hasTags = false,
  rowItems = [],
  columnItems = [],
}) => {
  const [state, dispatch] = useTracked();
  const {colors} = state;
  const [focused, setFocused] = useState(false);
  const [note, setNote] = useState(
    item
      ? item
      : {
          colors: [],
          tags: [],
          pinned: false,
          favorite: false,
          locked: false,
          content: {
            text: null,
            delta: null,
          },
          dateCreated: null,
        },
  );

  function changeColorScheme(colors = COLOR_SCHEME, accent = ACCENT) {
    let newColors = setColorScheme(colors, accent);
    StatusBar.setBarStyle(newColors.night ? 'light-content' : 'dark-content');

    dispatch({type: ACTIONS.THEME, colors: newColors});
  }

  useEffect(() => {
    if (item.dateCreated !== null) {
      setNote({...item});
    }
  }, [item]);

  let tagToAdd = null;
  let backPressCount = 0;

  const _onSubmit = async () => {
    if (!tagToAdd || tagToAdd === '') return;

    let tag = tagToAdd;

    if (tag.includes(' ')) {
      tag = tag.replace(' ', '_');
    }
    tagsInputRef.setNativeProps({
      text: '',
    });

    await db.addTag(note.dateCreated, tag);
    setNote({...db.getNote(note.dateCreated)});
    tagToAdd = '';
  };

  const _onKeyPress = async event => {
    if (event.nativeEvent.key === 'Backspace') {
      if (backPressCount === 0 && !tagToAdd) {
        backPressCount = 1;

        return;
      }
      if (backPressCount === 1 && !tagToAdd) {
        backPressCount = 0;

        let tagInputValue = note.tags[note.tags.length - 1];
        let oldProps = {...note};
        if (oldProps.tags.length === 0) return;
        //oldProps.tags.splice(oldProps.tags.length - 1);
        await db.removeTag(
          note.dateCreated,
          oldProps.tags[oldProps.tags.length - 1],
        );

        setNote({...db.getNote(note.dateCreated)});

        tagsInputRef.setNativeProps({
          text: tagInputValue,
        });

        setTimeout(() => {
          //tagsInputRef.focus();
        }, 300);
      }
    }
  };

  const localRefresh = (type, nodispatch = false) => {
    if (!note || !note.dateCreated) return;
    let toAdd;
    console.log(type);
    switch (type) {
      case 'note': {
        toAdd = db.getNote(note.dateCreated);
        break;
      }
      case 'notebook': {
        toAdd = db.getNotebook(note.dateCreated);
        break;
      }
      case 'topic': {
        console.log(note, 'topics');
        toAdd = db.getTopic(note.notebookId, note.title);
        console.log(toAdd, 'heree');
        break;
      }
    }
    if (!toAdd || !toAdd.dateCreated) return;

    if (!nodispatch) {
      dispatch({type: type});
      dispatch({type: ACTIONS.PINNED});
      dispatch({type: ACTIONS.FAVORITES});
    }
    setNote({...toAdd});
  };

  const rowItemsData = [
    {
      name: 'Add to',
      icon: 'book',
      func: () => {
        dispatch({type: ACTIONS.MODAL_NAVIGATOR, enabled: true});
        dispatch({type: ACTIONS.SELECTED_ITEMS, item: note});
        moveNoteEvent();
        close();
      },
    },
    {
      name: 'Share',
      icon: 'share-2',
      func: () => {
        if (note.locked) {
          close('unlock_share');
        } else {
          close();
          let m = `${note.title}\n \n ${note.content.text}`;

          Share.open({
            title: 'Share note to',
            failOnCancel: false,
            message: m,
          });
        }
      },
    },
    {
      name: 'Export',
      icon: 'external-link',
      func: () => {
        close();
      },
    },
    {
      name: 'Delete',
      icon: 'trash',
      func: () => close('delete'),
    },
    {
      name: 'Edit Notebook',
      icon: 'trash',
      func: () => {
        close('notebook');
      },
    },
    {
      name: 'Edit Topic',
      icon: 'trash',
      func: () => {
        close('topic');
      },
    },
    {
      name: 'Restore',
      icon: 'trash',
      func: () => {
        db.restoreItem(item.dateCreated);
        ToastEvent.show(
          item.type === 'note' ? 'Note restored' : 'Notebook restored',
          'success',
          1000,
          () => {},
          '',
        );
        close();
      },
    },
    {
      name: 'Remove',
      icon: 'trash',
      func: () => {
        close();
      },
    },
  ];

  const columnItemsData = [
    {
      name: 'Dark Mode',
      icon: 'moon',
      func: () => {
        if (!colors.night) {
          FastStorage.setItem('theme', JSON.stringify({night: true}));
          changeColorScheme(COLOR_SCHEME_DARK);
        } else {
          FastStorage.setItem('theme', JSON.stringify({night: false}));
          changeColorScheme(COLOR_SCHEME_LIGHT);
        }
      },
      switch: true,
      on: colors.night ? true : false,
      close: false,
    },
    {
      name: 'Pin',
      icon: 'tag',
      func: async () => {
        if (!note.dateCreated) return;
        if (note.type === 'note') {
          await db.pinNote(note.dateCreated);
        } else {
          await db.pinNotebook(note.dateCreated);
        }
        dispatch({type: ACTIONS.PINNED});
        localRefresh(item.type);
      },
      close: false,
      check: true,
      on: note.pinned,
    },
    {
      name: 'Favorite',
      icon: 'star',
      func: async () => {
        if (!note.dateCreated) return;
        if (note.type === 'note') {
          await db.favoriteNotes([note.dateCreated]);
        } else {
          await db.favoriteNotebooks([note.dateCreated]);
        }
        dispatch({type: ACTIONS.FAVORITES});
        localRefresh(item.type);
      },
      close: false,
      check: true,
      on: note.favorite,
    },
    {
      name: 'Add to Vault',
      icon: 'lock',
      func: () => {
        if (!note.dateCreated) return;
        note.locked ? close('unlock') : close('lock');
      },
      close: true,
      check: true,
      on: note.locked,
    },
  ];

  const _renderTag = tag => (
    <TouchableOpacity
      key={tag}
      onPress={async () => {
        let oldProps = {...note};

        oldProps.tags.splice(oldProps.tags.indexOf(tag), 1);
        await db.addNote({
          dateCreated: note.dateCreated,
          tags: oldProps.tags,
        });
        localRefresh(item.type);
      }}
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        margin: 1,
        paddingHorizontal: 5,
        paddingVertical: 2.5,
      }}>
      <Text
        style={{
          fontFamily: WEIGHT.regular,
          fontSize: SIZE.sm,
          color: colors.pri,
        }}>
        <Text
          style={{
            color: colors.accent,
          }}>
          {tag.slice(0, 1)}
        </Text>
        {tag.slice(1)}
      </Text>
    </TouchableOpacity>
  );

  const _renderColor = color => (
    <TouchableOpacity
      key={color}
      onPress={() => {
        let noteColors = note.colors;

        if (noteColors.includes(color)) {
          noteColors.splice(color, 1);
        } else {
          noteColors.push(color);
        }

        db.addNote({
          dateCreated: note.dateCreated,
          colors: noteColors,
          content: note.content,
          title: note.title,
        });
        localRefresh(item.type);
      }}
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        borderColor: colors.nav,
      }}>
      <View
        style={{
          width: DDS.isTab ? 500 / 10 : w / 10,
          height: DDS.isTab ? 500 / 10 : w / 10,
          backgroundColor: color,
          borderRadius: 100,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        {note && note.colors && note.colors.includes(color) ? (
          <Icon name="check" color="white" size={SIZE.lg} />
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const _renderRowItem = rowItem =>
    rowItems.includes(rowItem.name) ? (
      <TouchableOpacity
        onPress={rowItem.func}
        key={rowItem.name}
        style={{
          alignItems: 'center',
          width: DDS.isTab ? 500 / rowItems.length : w / rowItems.length,
        }}>
        <Icon
          style={{
            width: 50,
            height: 40,
            borderRadius: 100,
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            textAlignVertical: 'center',
            marginBottom: DDS.isTab ? 7 : 3.5,
          }}
          name={rowItem.icon}
          size={DDS.isTab ? SIZE.xl : SIZE.lg}
          color={colors.accent}
        />

        <Text
          style={{
            fontFamily: WEIGHT.regular,
            fontSize: DDS.isTab ? SIZE.sm : SIZE.xs + 2,
            color: colors.pri,
          }}>
          {rowItem.name}
        </Text>
      </TouchableOpacity>
    ) : null;

  const _renderColumnItem = item =>
    (note.dateCreated && columnItems.includes(item.name)) ||
    (item.name === 'Dark Mode' && columnItems.includes(item.name)) ? (
      <TouchableOpacity
        key={item.name}
        activeOpacity={opacity}
        onPress={() => {
          item.func();
        }}
        style={{
          width: '100%',
          alignSelf: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingHorizontal: 12,
          paddingVertical: pv,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <Icon
            style={{
              width: 30,
            }}
            name={item.icon}
            color={colors.pri}
            size={SIZE.md}
          />
          <Text
            style={{
              fontFamily: WEIGHT.regular,
              fontSize: SIZE.sm,
              color: colors.pri,
            }}>
            {item.name}
          </Text>
        </View>
        {item.switch ? (
          <Icon
            size={SIZE.lg + 2}
            color={item.on ? colors.accent : colors.icon}
            name={item.on ? 'toggle-right' : 'toggle-left'}
          />
        ) : (
          undefined
        )}
        {item.check ? (
          <TouchableOpacity
            style={{
              borderWidth: 2,
              borderColor: item.on ? colors.accent : colors.icon,
              width: 23,
              height: 23,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 100,
              paddingTop: 3,
            }}>
            {item.on ? (
              <Icon size={SIZE.sm - 2} color={colors.accent} name="check" />
            ) : null}
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    ) : null;

  return (
    <View
      onLayout={() => {
        if (!item.dateDeleted) {
          localRefresh(item.type, true);
        }
        console.log(note.dateCreated, 'here');
      }}
      style={{
        paddingBottom: 15,
        backgroundColor: colors.bg,
        width: '100%',
        paddingHorizontal: 0,
      }}>
      {!note.dateCreated ? (
        <Text
          style={{
            width: '100%',
            textAlign: 'center',
            marginVertical: 10,
            color: colors.icon,
            fontFamily: WEIGHT.regular,
          }}>
          Please start writing to save your note.
        </Text>
      ) : null}

      {note.dateCreated ? (
        <View
          style={{
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 10,
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: colors.nav,
          }}>
          {rowItemsData.map(_renderRowItem)}
        </View>
      ) : null}

      {hasColors && note.dateCreated ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            paddingHorizontal: 12,
            width: '100%',
            marginVertical: 10,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          {['red', 'yellow', 'green', 'blue', 'purple', 'orange', 'gray'].map(
            _renderColor,
          )}
        </View>
      ) : null}

      {hasTags && note.dateCreated ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginHorizontal: 12,
            marginBottom: 0,
            borderRadius: 5,
            borderWidth: 1.5,
            borderColor: focused ? colors.accent : colors.nav,
            paddingVertical: 5,
          }}>
          {note && note.tags ? note.tags.map(_renderTag) : null}
          <TextInput
            style={{
              backgroundColor: 'transparent',
              minWidth: 100,
              fontFamily: WEIGHT.regular,
              color: colors.pri,
              paddingHorizontal: 5,
              paddingVertical: 1.5,
              margin: 1,
            }}
            blurOnSubmit={false}
            ref={ref => (tagsInputRef = ref)}
            placeholderTextColor={colors.icon}
            onFocus={() => {
              setFocused(true);
            }}
            selectionColor={colors.accent}
            onBlur={() => {
              setFocused(false);
            }}
            placeholder="#hashtag"
            onChangeText={value => {
              tagToAdd = value;
              if (tagToAdd.length > 0) backPressCount = 0;
            }}
            onSubmitEditing={_onSubmit}
            onKeyPress={_onKeyPress}
          />
        </View>
      ) : null}

      {columnItems.length > 0 ? (
        <View>{columnItemsData.map(_renderColumnItem)}</View>
      ) : null}

      {DDS.isTab ? (
        <View
          style={{
            height: 20,
          }}
        />
      ) : null}
    </View>
  );
};
