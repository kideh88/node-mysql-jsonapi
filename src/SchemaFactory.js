'use strict';

/**
 * Set and remap the given information schema data to a usable mapping object in this.dataStructure
 *
 * @param input string
 * @return boolean
 **/
function stringToBoolean (input) {
  switch(input.toLowerCase().trim()){
    case "true":
    case "yes":
    case "1":
      return true;
    case "false":
    case "no":
    case "0":
    case null:
      return false;
    default:
      return Boolean(input);
  }
}

class Column {
  isRestricted () {
    return this.is_restricted;
  }

  isNullable () {
    return (this.is_nullable === 'YES');
  }

  isPrimaryKey () {
    return this.is_primaryKey;
  }

  isForeignKey () {
    return this.is_foreignKey;
  }

  parseInput (input) {
    switch(typeof this.simplified_type) {
      case 'string':
        return input.toString();
      case 'number':
        return parseInt(input);
      case 'boolean':
        return stringToBoolean(input);
      case 'float':
        // To match price floats
        return parseFloat(input).toFixed(2);
      case 'timestamp':
        // To match UNIX inserts
        return parseInt(input);
      default:
        return input.toString();
    }
  }

  parseOutput (output) {
    switch(typeof this.simplified_type) {
      case 'string':
      case 'number':
      case 'boolean':
      case 'float':
      case 'timestamp':
      default:
        return output.toString();
    }
  }

  hasSelectModifier () {
    //this.
  }

}

class Table {
  getSelectorArray () {
    return ['table.column1', 'table.column2'];
  }
}

class Schema {
  hasTable () {
    console.log(this);
    return false;
  }
}

// MOVE ALL SCHEMA SCAN INTO THIS CLASS

class SchemaFactory {
  constructor (schema) {
    // CONSTRUCTOR NEEDS DATABASE TYPE PARAM
    // PULL EVERYTHING SCHEMA RELATED INTO ITS OWN REPO
    // SchemaFactory with column, table, schema classes
    // MySQLStructure.js inside a /scanner/ directory where other scanners can be added later
    // Dynamic require() in SchemaFactory to only add the scanner we need?

    let tableName, columnName;


    for (tableName in schema) {
      for (columnName in schema[tableName]) {
        if(columnName === 'INVERSE_RELATIONS') {
          // Set relation functions
          // getInverseRelations
        } else if(columnName === 'RELATIONS') {
          // Set relation functions
          // getRelations
        } else {
          Object.setPrototypeOf(schema[tableName][columnName], Column.prototype);
        }
        if(columnName === 'title') {
          console.log('function test', schema[tableName][columnName].isHidden());
        }
      }
    }

    Object.setPrototypeOf(schema, Schema.prototype);


  }

}

module.exports = SchemaFactory;
