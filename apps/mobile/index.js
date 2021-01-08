import 'react-native-gesture-handler'
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import React from 'react';
import {Provider} from './src/provider';
import NotesnookShare from './NotesnookShare';


const AppProvider = () => {
  return (
    <Provider>
      <App />
    </Provider>
  );
};

AppRegistry.registerComponent(appName, () => AppProvider);
AppRegistry.registerComponent('NotesnookShare', () => NotesnookShare)
