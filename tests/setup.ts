import '@testing-library/jest-native/extend-expect';

(global as any).IS_REACT_ACT_ENVIRONMENT = true;




// Mock @expo/vector-icons para evitar warnings de act(...) por carregamento assíncrono de fontes nos testes

jest.mock('@expo/vector-icons', () => {

    const React = require('react');

    const { Text } = require('react-native');

    const MockIcon = (props: any) => React.createElement(Text, props, props.name);

    return {

        Ionicons: MockIcon,

        MaterialIcons: MockIcon,

        FontAwesome: MockIcon,

        Feather: MockIcon,

        AntDesign: MockIcon,

        Entypo: MockIcon,

    };

});
