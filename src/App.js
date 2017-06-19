import React, { Component } from 'react';
import Dropzone from 'react-dropzone';
import DxfParser from 'dxf-parser';
import Dxf from 'dxf';
import _ from 'lodash';

import logo from './logo.svg';
import './App.css';
import HelvetikerRegularTypeface from './fonts/helvetiker_regular.typeface.json';

/* global ThreeDxf, THREE */

function dataUri(type, string) {
  return `data:${type};base64,${btoa(unescape(encodeURIComponent(string)))}`;
}

function length(mesh) {
  if(!mesh || !mesh.geometry || !mesh.geometry.vertices) { return; }
  
  const result = mesh.geometry.vertices.reduce( ([prev, acc], {x,y}) => (
    [{x,y}, prev ? acc + Math.sqrt(Math.pow(x - prev.x, 2.0) + Math.pow(y - prev.y, 2.0)) : acc]
  ), [null, 0]);

  return result[1];
}

class DxfViewer extends Component {
  constructor(props) {
    super(props);

    this.initSvg = this.initSvg.bind(this);
    this.changeStrokeWidth = this.changeStrokeWidth.bind(this);
    
    this.version = 0;

    this.state = {
      strokeWidth: 0.5
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    return true;
  }

  initSvg(element) {
    if(element == null) return;
    
    const svgElement = _.find(element.childNodes, elem => elem.tagName === 'svg');
    this.svgElement = svgElement;

    svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    
    svgElement.childNodes.forEach(elem => {
      if(elem.tagName === 'path') {
        elem.setAttribute('stroke-width', this.state.strokeWidth + '%');
        elem.style.cursor = 'pointer';
      }
    });

    svgElement.addEventListener('mouseover', e => {
      const t = e.target;
      if(t.tagName === 'svg') return;
      
      t.setAttribute('stroke', 'red');
      t.setAttribute('stroke-width', (this.state.strokeWidth*2) + '%');
      if(this.props.onPathSelected) {
        this.props.onPathSelected(t);
      }
    });
    
    svgElement.addEventListener('mouseout', e => {
      const t = e.target;
      if(t.tagName === 'svg') return;

      t.setAttribute('stroke', 'black');
      t.setAttribute('stroke-width', this.state.strokeWidth + '%');
    });

    if(this.props.onLoad) {
      this.props.onLoad(svgElement);
    }
  }

  changeStrokeWidth(event) {
    const strokeWidth = event.target.value;

    this.svgElement.childNodes.forEach(elem => {
      if(elem.tagName === 'path') {
        elem.setAttribute('stroke-width', strokeWidth + '%');
        elem.style.cursor = 'pointer';
      }
    });
    
    this.setState({
      strokeWidth
    });
  }
  
  render() {
    const svg = Dxf.toSVG(this.props.parsedDxf);
    
    return (
      <div>
        <div ref={this.initSvg} key={svg} dangerouslySetInnerHTML={{__html: svg}}>
        </div>
        <p>Stroke width</p>
        <input type="range" min="0.1" max="5" step="0.01" value={this.state.strokeWidth} onChange={this.changeStrokeWidth} />
      </div>
    );
  }
}

class App extends Component {
  constructor(props) {
    super(props);

    this.onDrop = this.onDrop.bind(this);

    this.updateProgress = this.updateProgress.bind(this);
    this.abortUpload = this.abortUpload.bind(this);
    this.errorHandler = this.errorHandler.bind(this);
    this.onSuccess = this.onSuccess.bind(this);

    this.onPathSelected = this.onPathSelected.bind(this);
    this.setArcLength = this.setArcLength.bind(this);
    
    this.cadCanvas = null;

    this.state = {
    };
  }

  updateProgress(evt) {
  }

  abortUpload() {
  }

  errorHandler(evt) {
  }

  
  // cribbed from https://github.com/gdsestimating/three-dxf/blob/master/sample/index.js
  onSuccess(evt) {
    const fileReader = evt.target;
    if(fileReader.error) return console.log("error onloadend!?");

    try {
      const parsedDxf = Dxf.parseString(fileReader.result);

      const parser = new DxfParser();
      const dxf = parser.parseSync(fileReader.result);

      console.log(dxf.header);
      this.setState({
        parsedDxf,
        units: dxf && dxf.header['$MEASUREMENT'] === 0 ? 'in' : 'mm'
      });
    } catch (e) {
      console.error(e);
      this.setState({
        error: e
      });
    }
  }

  onDrop(acceptedFiles, rejectedFiles) {
    const [ file ] = acceptedFiles;
    
    /* global FileReader */
    const reader = new FileReader();
    reader.onprogress = this.updateProgress;
    reader.onloadend = this.onSuccess;
    reader.onabort = this.abortUpload;
    reader.onerror = this.errorHandler;

    reader.readAsText(file);    
  }

  onPathSelected(path) {
    console.log(path);
    this.setState({
      selectedPathLength: path.getTotalLength()
    });
  }

  setArcLength(svg) {
    const totalPathLength =
          _.chain(svg.childNodes)
           .filter(elem => elem.tagName === 'path')
           .map( path => path.getTotalLength() )
           .sum()
           .value();
    
    this.setState({
      totalPathLength
    });
  }
  
  render() {
    return (
      <div className="App">
        <Dropzone className="file-dropzone" activeClassName="file-dropzone-active" disableClick disablePreview onDrop={this.onDrop}>
          {!this.state.parsedDxf ? (
            <h1>Drop a file here</h1>
          ) : (
            <div className="container">
            <DxfViewer onPathSelected={this.onPathSelected} onLoad={this.setArcLength} parsedDxf={this.state.parsedDxf}/>
            <div id="svg-info">
              <dl>
                <dt>Total path length:</dt>
                <dd>{this.state.totalPathLength ? `${this.state.totalPathLength.toFixed(2)} ${this.state.units}` : null}</dd>

                <dt>Selected path length:</dt>
                <dd>{this.state.selectedPathLength ? `${this.state.selectedPathLength.toFixed(2)} ${this.state.units}` : null}</dd>
              </dl>
            </div>
          </div>
          )}
        </Dropzone>
      </div>
    );
  }
}

export default App;
