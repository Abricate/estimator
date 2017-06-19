THREE.Shape.Utils.triangulateShape = function ( contour, holes ) {
  var myTriangulator = new PNLTRI.Triangulator();
  return myTriangulator.triangulate_polygon( [ contour ].concat(holes) );
};
