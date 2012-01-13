from setuptools import setup

setup(
    name='Avalon',
    version='1.0',
    long_description=__doc__,
    packages=['avalon'],
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        'Flask>=0.2'
    ]
)
