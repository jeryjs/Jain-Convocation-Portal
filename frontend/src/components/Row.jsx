import React from 'react';
import PropTypes from 'prop-types';

const Row = ({
    children,
    justify = 'flex-start',
    align = 'center',
    gap = '1rem',
    wrap = 'nowrap',
    className = '',
    style = {},
}) => {
    const baseStyle = {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: justify,
        alignItems: align,
        gap,
        flexWrap: wrap,
        width: '100%',
        ...style,
    };

    return (
        <div className={`row ${className}`} style={baseStyle}>
            {children}
        </div>
    );
};

Row.propTypes = {
    children: PropTypes.node,
    justify: PropTypes.oneOf([
        'flex-start',
        'flex-end',
        'center',
        'space-between',
        'space-around',
        'space-evenly',
    ]),
    align: PropTypes.oneOf([
        'flex-start',
        'flex-end',
        'center',
        'stretch',
        'baseline',
    ]),
    gap: PropTypes.string,
    wrap: PropTypes.oneOf(['nowrap', 'wrap', 'wrap-reverse']),
    className: PropTypes.string,
    style: PropTypes.object,
};

export default Row;